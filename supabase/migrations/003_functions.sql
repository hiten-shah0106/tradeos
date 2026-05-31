-- ============================================================
-- TradeOS: Database Functions & Triggers
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. Auto-create profile on auth.users insert
-- ────────────────────────────────────────────────
-- Triggered whenever a new user signs up through Supabase Auth.
-- Copies id, email, and optional name from raw_user_meta_data.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  -- Also create default user_settings row
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- Drop and recreate to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────
-- 2. Calculate account analytics
-- ────────────────────────────────────────────────
-- Returns key performance metrics for a given account.
-- Only considers CLOSED trades with a non-null pnl.

CREATE OR REPLACE FUNCTION public.calculate_account_analytics(p_account_id UUID)
RETURNS TABLE (
  total_trades   INTEGER,
  winning_trades INTEGER,
  losing_trades  INTEGER,
  win_rate       NUMERIC,
  profit_factor  NUMERIC,
  avg_rr         NUMERIC,
  total_pnl      NUMERIC,
  max_drawdown   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_trades   INTEGER;
  v_winning_trades INTEGER;
  v_losing_trades  INTEGER;
  v_gross_profit   NUMERIC;
  v_gross_loss     NUMERIC;
  v_total_pnl      NUMERIC;
  v_avg_rr         NUMERIC;
  v_max_drawdown   NUMERIC;
  v_running_pnl    NUMERIC := 0;
  v_peak_pnl       NUMERIC := 0;
  v_current_dd     NUMERIC := 0;
  trade_rec        RECORD;
BEGIN
  -- Verify the caller owns this account
  IF NOT EXISTS (
    SELECT 1 FROM accounts
    WHERE id = p_account_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: account does not belong to user';
  END IF;

  -- Aggregate closed trade stats
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE pnl > 0)::INTEGER,
    COUNT(*) FILTER (WHERE pnl < 0)::INTEGER,
    COALESCE(SUM(pnl) FILTER (WHERE pnl > 0), 0),
    COALESCE(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0),
    COALESCE(SUM(pnl), 0),
    COALESCE(AVG(rr_ratio) FILTER (WHERE rr_ratio IS NOT NULL), 0)
  INTO
    v_total_trades, v_winning_trades, v_losing_trades,
    v_gross_profit, v_gross_loss, v_total_pnl, v_avg_rr
  FROM trades
  WHERE account_id = p_account_id
    AND status = 'CLOSED'
    AND pnl IS NOT NULL;

  -- Calculate max drawdown by iterating through trades chronologically
  v_max_drawdown := 0;
  FOR trade_rec IN
    SELECT pnl AS trade_pnl
    FROM trades
    WHERE account_id = p_account_id
      AND status = 'CLOSED'
      AND pnl IS NOT NULL
    ORDER BY close_timestamp ASC NULLS LAST
  LOOP
    v_running_pnl := v_running_pnl + trade_rec.trade_pnl;

    IF v_running_pnl > v_peak_pnl THEN
      v_peak_pnl := v_running_pnl;
    END IF;

    v_current_dd := v_peak_pnl - v_running_pnl;

    IF v_current_dd > v_max_drawdown THEN
      v_max_drawdown := v_current_dd;
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    v_total_trades,
    v_winning_trades,
    v_losing_trades,
    CASE WHEN v_total_trades > 0
      THEN ROUND((v_winning_trades::NUMERIC / v_total_trades) * 100, 2)
      ELSE 0
    END,
    CASE WHEN v_gross_loss > 0
      THEN ROUND(v_gross_profit / v_gross_loss, 2)
      ELSE CASE WHEN v_gross_profit > 0 THEN 999.99 ELSE 0 END
    END,
    ROUND(v_avg_rr, 2),
    ROUND(v_total_pnl, 2),
    ROUND(v_max_drawdown, 2);
END;
$$;


-- ────────────────────────────────────────────────
-- 3. Check prop firm rule violations
-- ────────────────────────────────────────────────
-- Compares current account metrics against the rules
-- defined in account_rules. Returns each rule with
-- its limit, current value, and whether it's violated.

CREATE OR REPLACE FUNCTION public.check_rule_violations(p_account_id UUID)
RETURNS TABLE (
  rule_name     TEXT,
  rule_limit    NUMERIC,
  current_value NUMERIC,
  is_violated   BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules             RECORD;
  v_account           RECORD;
  v_daily_pnl         NUMERIC;
  v_total_drawdown    NUMERIC;
  v_open_trade_count  INTEGER;
  v_analytics         RECORD;
BEGIN
  -- Verify the caller owns this account
  IF NOT EXISTS (
    SELECT 1 FROM accounts
    WHERE id = p_account_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: account does not belong to user';
  END IF;

  -- Fetch account details
  SELECT * INTO v_account
  FROM accounts
  WHERE id = p_account_id;

  -- Fetch rules (may not exist)
  SELECT * INTO v_rules
  FROM account_rules
  WHERE account_id = p_account_id;

  -- If no rules defined, return empty
  IF v_rules IS NULL THEN
    RETURN;
  END IF;

  -- Calculate today's PnL
  SELECT COALESCE(SUM(pnl), 0) INTO v_daily_pnl
  FROM trades
  WHERE account_id = p_account_id
    AND status = 'CLOSED'
    AND pnl IS NOT NULL
    AND close_timestamp >= (CURRENT_DATE AT TIME ZONE 'UTC');

  -- Calculate total drawdown from starting balance
  v_total_drawdown := CASE
    WHEN v_account.starting_balance > 0
    THEN ((v_account.starting_balance - v_account.current_balance) / v_account.starting_balance) * 100
    ELSE 0
  END;

  -- Count currently open trades
  SELECT COUNT(*)::INTEGER INTO v_open_trade_count
  FROM trades
  WHERE account_id = p_account_id
    AND status IN ('OPEN', 'PARTIAL');

  -- Check daily drawdown rule
  IF v_rules.daily_drawdown_percent IS NOT NULL THEN
    RETURN QUERY SELECT
      'daily_drawdown'::TEXT,
      v_rules.daily_drawdown_percent,
      CASE
        WHEN v_account.starting_balance > 0
        THEN ROUND(ABS(LEAST(v_daily_pnl, 0)) / v_account.starting_balance * 100, 2)
        ELSE 0::NUMERIC
      END,
      CASE
        WHEN v_account.starting_balance > 0
        THEN (ABS(LEAST(v_daily_pnl, 0)) / v_account.starting_balance * 100) >= v_rules.daily_drawdown_percent
        ELSE false
      END;
  END IF;

  -- Check max drawdown rule
  IF v_rules.max_drawdown_percent IS NOT NULL THEN
    RETURN QUERY SELECT
      'max_drawdown'::TEXT,
      v_rules.max_drawdown_percent,
      ROUND(GREATEST(v_total_drawdown, 0), 2),
      v_total_drawdown >= v_rules.max_drawdown_percent;
  END IF;

  -- Check max open trades rule
  IF v_rules.max_open_trades IS NOT NULL THEN
    RETURN QUERY SELECT
      'max_open_trades'::TEXT,
      v_rules.max_open_trades::NUMERIC,
      v_open_trade_count::NUMERIC,
      v_open_trade_count >= v_rules.max_open_trades;
  END IF;

  -- Check profit target (this is a goal, not a violation — violated = achieved)
  IF v_rules.profit_target_percent IS NOT NULL THEN
    RETURN QUERY SELECT
      'profit_target'::TEXT,
      v_rules.profit_target_percent,
      CASE
        WHEN v_account.starting_balance > 0
        THEN ROUND(((v_account.current_balance - v_account.starting_balance) / v_account.starting_balance) * 100, 2)
        ELSE 0::NUMERIC
      END,
      CASE
        WHEN v_account.starting_balance > 0
        THEN ((v_account.current_balance - v_account.starting_balance) / v_account.starting_balance * 100) >= v_rules.profit_target_percent
        ELSE false
      END;
  END IF;

  RETURN;
END;
$$;
