-- ============================================================
-- TradeOS: Initial Schema Migration
-- ============================================================
-- Creates all 13 tables with proper types, constraints,
-- indexes, and foreign key relationships.
-- ============================================================

-- ────────────────────────────────────────────────
-- Custom Enum Types
-- ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('personal', 'challenge', 'funded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trade_direction AS ENUM ('BUY', 'SELL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trade_status AS ENUM ('OPEN', 'PARTIAL', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tag_type AS ENUM ('user', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ────────────────────────────────────────────────
-- 1. profiles
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  timezone    TEXT NOT NULL DEFAULT 'UTC',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────
-- 2. accounts
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  account_type     account_type NOT NULL DEFAULT 'personal',
  broker           TEXT,
  account_size     NUMERIC,
  starting_balance NUMERIC NOT NULL,
  current_balance  NUMERIC NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT accounts_account_size_positive CHECK (account_size IS NULL OR account_size > 0),
  CONSTRAINT accounts_starting_balance_positive CHECK (starting_balance > 0)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);


-- ────────────────────────────────────────────────
-- 3. account_rules
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS account_rules (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  profit_target_percent     NUMERIC,
  daily_drawdown_percent    NUMERIC,
  max_drawdown_percent      NUMERIC,
  minimum_trading_days      INTEGER,
  consistency_enabled       BOOLEAN NOT NULL DEFAULT false,
  consistency_percent       NUMERIC,
  max_risk_per_trade_percent NUMERIC,
  max_open_trades           INTEGER,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT rules_profit_target_positive CHECK (profit_target_percent IS NULL OR profit_target_percent > 0),
  CONSTRAINT rules_daily_drawdown_positive CHECK (daily_drawdown_percent IS NULL OR daily_drawdown_percent > 0),
  CONSTRAINT rules_max_drawdown_positive CHECK (max_drawdown_percent IS NULL OR max_drawdown_percent > 0),
  CONSTRAINT rules_consistency_positive CHECK (consistency_percent IS NULL OR consistency_percent > 0),
  CONSTRAINT rules_max_risk_positive CHECK (max_risk_per_trade_percent IS NULL OR max_risk_per_trade_percent > 0),
  CONSTRAINT rules_max_open_trades_positive CHECK (max_open_trades IS NULL OR max_open_trades > 0),
  CONSTRAINT rules_min_trading_days_positive CHECK (minimum_trading_days IS NULL OR minimum_trading_days > 0)
);

CREATE INDEX IF NOT EXISTS idx_account_rules_account_id ON account_rules(account_id);


-- ────────────────────────────────────────────────
-- 4. trades
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol          TEXT NOT NULL,
  direction       trade_direction NOT NULL,
  entry_price     NUMERIC NOT NULL,
  stop_loss       NUMERIC,
  take_profit     NUMERIC,
  lot_size        NUMERIC NOT NULL,
  exit_price      NUMERIC,
  open_timestamp  TIMESTAMPTZ NOT NULL,
  close_timestamp TIMESTAMPTZ,
  status          trade_status NOT NULL DEFAULT 'OPEN',
  pnl             NUMERIC,
  rr_ratio        NUMERIC,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT trades_entry_price_positive CHECK (entry_price > 0),
  CONSTRAINT trades_lot_size_positive CHECK (lot_size > 0),
  CONSTRAINT trades_exit_price_positive CHECK (exit_price IS NULL OR exit_price > 0),
  CONSTRAINT trades_stop_loss_positive CHECK (stop_loss IS NULL OR stop_loss > 0),
  CONSTRAINT trades_take_profit_positive CHECK (take_profit IS NULL OR take_profit > 0)
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_open_timestamp ON trades(open_timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);


-- ────────────────────────────────────────────────
-- 5. trade_partials
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trade_partials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id    UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  quantity    NUMERIC NOT NULL,
  close_price NUMERIC NOT NULL,
  pnl         NUMERIC NOT NULL,
  closed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT partials_quantity_positive CHECK (quantity > 0),
  CONSTRAINT partials_close_price_positive CHECK (close_price > 0)
);

CREATE INDEX IF NOT EXISTS idx_trade_partials_trade_id ON trade_partials(trade_id);


-- ────────────────────────────────────────────────
-- 6. trade_images
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trade_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id   UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  caption    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_images_trade_id ON trade_images(trade_id);


-- ────────────────────────────────────────────────
-- 7. tags
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  tag_type   tag_type NOT NULL DEFAULT 'user',
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tags_unique_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);


-- ────────────────────────────────────────────────
-- 8. trade_tags (junction table)
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trade_tags (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  CONSTRAINT trade_tags_unique UNIQUE (trade_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_tags_trade_id ON trade_tags(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_tag_id ON trade_tags(tag_id);


-- ────────────────────────────────────────────────
-- 9. trade_templates
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trade_templates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  symbol               TEXT,
  default_risk_percent NUMERIC,
  default_tags         TEXT[],
  config               JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT templates_risk_positive CHECK (default_risk_percent IS NULL OR default_risk_percent > 0)
);

CREATE INDEX IF NOT EXISTS idx_trade_templates_user_id ON trade_templates(user_id);


-- ────────────────────────────────────────────────
-- 10. saved_views
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  filters     JSONB,
  sort_config JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON saved_views(user_id);


-- ────────────────────────────────────────────────
-- 11. analytics_snapshots
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  metrics_json  JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT snapshots_unique_per_day UNIQUE (account_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_account_id ON analytics_snapshots(account_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date);


-- ────────────────────────────────────────────────
-- 12. notifications
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  type       notification_type NOT NULL DEFAULT 'INFO',
  title      TEXT NOT NULL,
  message    TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);


-- ────────────────────────────────────────────────
-- 13. user_settings
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_settings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  dashboard_layout         JSONB,
  notification_preferences JSONB,
  theme                    TEXT NOT NULL DEFAULT 'system',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);


-- ────────────────────────────────────────────────
-- updated_at trigger function (shared)
-- ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY[
      'profiles', 'accounts', 'account_rules', 'trades',
      'trade_templates', 'saved_views', 'user_settings'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; 
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl
    );
  END LOOP;
END $$;
