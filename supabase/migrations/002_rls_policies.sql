-- ============================================================
-- TradeOS: Row Level Security Policies
-- ============================================================
-- Every table is protected. Users can only access their own
-- data. Child tables verify ownership through parent joins.
-- ============================================================

-- ────────────────────────────────────────────────
-- Enable RLS on all tables
-- ────────────────────────────────────────────────

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades              ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_partials      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views         ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings       ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = id);


-- ────────────────────────────────────────────────
-- accounts
-- ────────────────────────────────────────────────

CREATE POLICY "accounts_select_own" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "accounts_insert_own" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_update_own" ON accounts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_delete_own" ON accounts
  FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────
-- account_rules  (join through accounts)
-- ────────────────────────────────────────────────

CREATE POLICY "account_rules_select_own" ON account_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = account_rules.account_id
        AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "account_rules_insert_own" ON account_rules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = account_rules.account_id
        AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "account_rules_update_own" ON account_rules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = account_rules.account_id
        AND accounts.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = account_rules.account_id
        AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "account_rules_delete_own" ON account_rules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = account_rules.account_id
        AND accounts.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────
-- trades
-- ────────────────────────────────────────────────

CREATE POLICY "trades_select_own" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "trades_insert_own" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trades_update_own" ON trades
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trades_delete_own" ON trades
  FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────
-- trade_partials  (join through trades)
-- ────────────────────────────────────────────────

CREATE POLICY "trade_partials_select_own" ON trade_partials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_partials.trade_id
        AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_partials_insert_own" ON trade_partials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_partials.trade_id
        AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_partials_update_own" ON trade_partials
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_partials.trade_id
        AND trades.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_partials.trade_id
        AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_partials_delete_own" ON trade_partials
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_partials.trade_id
        AND trades.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────
-- trade_images  (join through trades)
-- ────────────────────────────────────────────────

CREATE POLICY "trade_images_select_own" ON trade_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_images.trade_id
        AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_images_insert_own" ON trade_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_images.trade_id
        AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_images_update_own" ON trade_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_images.trade_id
        AND trades.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_images.trade_id
        AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_images_delete_own" ON trade_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_images.trade_id
        AND trades.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────
-- tags
-- ────────────────────────────────────────────────

CREATE POLICY "tags_select_own" ON tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tags_insert_own" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tags_update_own" ON tags
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tags_delete_own" ON tags
  FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────
-- trade_tags  (join through trades)
-- ────────────────────────────────────────────────

CREATE POLICY "trade_tags_select_own" ON trade_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_tags.trade_id
        AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_tags_insert_own" ON trade_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_tags.trade_id
        AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_tags_delete_own" ON trade_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_tags.trade_id
        AND trades.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────
-- trade_templates
-- ────────────────────────────────────────────────

CREATE POLICY "trade_templates_select_own" ON trade_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "trade_templates_insert_own" ON trade_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trade_templates_update_own" ON trade_templates
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trade_templates_delete_own" ON trade_templates
  FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────
-- saved_views
-- ────────────────────────────────────────────────

CREATE POLICY "saved_views_select_own" ON saved_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "saved_views_insert_own" ON saved_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_views_update_own" ON saved_views
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_views_delete_own" ON saved_views
  FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────
-- analytics_snapshots  (join through accounts)
-- ────────────────────────────────────────────────

CREATE POLICY "analytics_snapshots_select_own" ON analytics_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = analytics_snapshots.account_id
        AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "analytics_snapshots_insert_own" ON analytics_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = analytics_snapshots.account_id
        AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "analytics_snapshots_delete_own" ON analytics_snapshots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = analytics_snapshots.account_id
        AND accounts.user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────
-- notifications
-- ────────────────────────────────────────────────

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────
-- user_settings
-- ────────────────────────────────────────────────

CREATE POLICY "user_settings_select_own" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_own" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_own" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_delete_own" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);
