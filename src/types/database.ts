// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export type AccountType = 'personal' | 'challenge' | 'funded'
export type TradeDirection = 'BUY' | 'SELL'
export type TradeStatus = 'OPEN' | 'PARTIAL' | 'CLOSED'
export type NotificationType = 'INFO' | 'WARNING' | 'CRITICAL'
export type TagType = 'user' | 'system'

// ──────────────────────────────────────────────
// Row Types (what you get back from a SELECT)
// ──────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  account_type: AccountType
  broker: string | null
  account_size: number | null
  starting_balance: number
  current_balance: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AccountRule {
  id: string
  account_id: string
  profit_target_percent: number | null
  daily_drawdown_percent: number | null
  max_drawdown_percent: number | null
  minimum_trading_days: number | null
  consistency_enabled: boolean
  consistency_percent: number | null
  max_risk_per_trade_percent: number | null
  max_open_trades: number | null
  created_at: string
  updated_at: string
}

export interface Trade {
  id: string
  account_id: string
  user_id: string
  symbol: string
  direction: TradeDirection
  entry_price: number
  stop_loss: number | null
  take_profit: number | null
  lot_size: number
  exit_price: number | null
  open_timestamp: string
  close_timestamp: string | null
  status: TradeStatus
  pnl: number | null
  rr_ratio: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TradePartial {
  id: string
  trade_id: string
  quantity: number
  close_price: number
  pnl: number
  closed_at: string
}

export interface TradeImage {
  id: string
  trade_id: string
  image_url: string
  caption: string | null
  created_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  tag_type: TagType
  color: string | null
  created_at: string
}

export interface TradeTag {
  id: string
  trade_id: string
  tag_id: string
}

export interface TradeTemplate {
  id: string
  user_id: string
  name: string
  symbol: string | null
  default_risk_percent: number | null
  default_tags: string[] | null
  config: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface SavedView {
  id: string
  user_id: string
  name: string
  filters: Record<string, unknown> | null
  sort_config: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface AnalyticsSnapshot {
  id: string
  account_id: string
  snapshot_date: string
  metrics_json: Record<string, unknown>
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  account_id: string | null
  type: NotificationType
  title: string
  message: string | null
  is_read: boolean
  created_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  dashboard_layout: Record<string, unknown> | null
  notification_preferences: Record<string, unknown> | null
  theme: string
  created_at: string
  updated_at: string
}

// ──────────────────────────────────────────────
// Insert Types (omit auto-generated fields)
// ──────────────────────────────────────────────

export interface ProfileInsert {
  id: string
  email: string
  name?: string | null
  avatar_url?: string | null
  timezone?: string
  created_at?: string
  updated_at?: string
}

export interface AccountInsert {
  id?: string
  user_id: string
  name: string
  account_type?: AccountType
  broker?: string | null
  account_size?: number | null
  starting_balance: number
  current_balance?: number
  currency?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface AccountRuleInsert {
  id?: string
  account_id: string
  profit_target_percent?: number | null
  daily_drawdown_percent?: number | null
  max_drawdown_percent?: number | null
  minimum_trading_days?: number | null
  consistency_enabled?: boolean
  consistency_percent?: number | null
  max_risk_per_trade_percent?: number | null
  max_open_trades?: number | null
  created_at?: string
  updated_at?: string
}

export interface TradeInsert {
  id?: string
  account_id: string
  user_id: string
  symbol: string
  direction: TradeDirection
  entry_price: number
  stop_loss?: number | null
  take_profit?: number | null
  lot_size: number
  exit_price?: number | null
  open_timestamp: string
  close_timestamp?: string | null
  status?: TradeStatus
  pnl?: number | null
  rr_ratio?: number | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface TradePartialInsert {
  id?: string
  trade_id: string
  quantity: number
  close_price: number
  pnl: number
  closed_at?: string
}

export interface TradeImageInsert {
  id?: string
  trade_id: string
  image_url: string
  caption?: string | null
  created_at?: string
}

export interface TagInsert {
  id?: string
  user_id: string
  name: string
  tag_type?: TagType
  color?: string | null
  created_at?: string
}

export interface TradeTagInsert {
  id?: string
  trade_id: string
  tag_id: string
}

export interface TradeTemplateInsert {
  id?: string
  user_id: string
  name: string
  symbol?: string | null
  default_risk_percent?: number | null
  default_tags?: string[] | null
  config?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export interface SavedViewInsert {
  id?: string
  user_id: string
  name: string
  filters?: Record<string, unknown> | null
  sort_config?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export interface AnalyticsSnapshotInsert {
  id?: string
  account_id: string
  snapshot_date: string
  metrics_json: Record<string, unknown>
  created_at?: string
}

export interface NotificationInsert {
  id?: string
  user_id: string
  account_id?: string | null
  type: NotificationType
  title: string
  message?: string | null
  is_read?: boolean
  created_at?: string
}

export interface UserSettingsInsert {
  id?: string
  user_id: string
  dashboard_layout?: Record<string, unknown> | null
  notification_preferences?: Record<string, unknown> | null
  theme?: string
  created_at?: string
  updated_at?: string
}

// ──────────────────────────────────────────────
// Update Types (all fields optional)
// ──────────────────────────────────────────────

export type ProfileUpdate = Partial<Omit<Profile, 'id'>>
export type AccountUpdate = Partial<Omit<Account, 'id' | 'user_id'>>
export type AccountRuleUpdate = Partial<Omit<AccountRule, 'id' | 'account_id'>>
export type TradeUpdate = Partial<Omit<Trade, 'id' | 'user_id'>>
export type TradePartialUpdate = Partial<Omit<TradePartial, 'id' | 'trade_id'>>
export type TradeImageUpdate = Partial<Omit<TradeImage, 'id' | 'trade_id'>>
export type TagUpdate = Partial<Omit<Tag, 'id' | 'user_id'>>
export type TradeTagUpdate = Partial<Omit<TradeTag, 'id'>>
export type TradeTemplateUpdate = Partial<Omit<TradeTemplate, 'id' | 'user_id'>>
export type SavedViewUpdate = Partial<Omit<SavedView, 'id' | 'user_id'>>
export type AnalyticsSnapshotUpdate = Partial<Omit<AnalyticsSnapshot, 'id' | 'account_id'>>
export type NotificationUpdate = Partial<Omit<Notification, 'id' | 'user_id'>>
export type UserSettingsUpdate = Partial<Omit<UserSettings, 'id' | 'user_id'>>

// ──────────────────────────────────────────────
// Supabase Database Type
// ──────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      accounts: {
        Row: Account
        Insert: AccountInsert
        Update: AccountUpdate
      }
      account_rules: {
        Row: AccountRule
        Insert: AccountRuleInsert
        Update: AccountRuleUpdate
      }
      trades: {
        Row: Trade
        Insert: TradeInsert
        Update: TradeUpdate
      }
      trade_partials: {
        Row: TradePartial
        Insert: TradePartialInsert
        Update: TradePartialUpdate
      }
      trade_images: {
        Row: TradeImage
        Insert: TradeImageInsert
        Update: TradeImageUpdate
      }
      tags: {
        Row: Tag
        Insert: TagInsert
        Update: TagUpdate
      }
      trade_tags: {
        Row: TradeTag
        Insert: TradeTagInsert
        Update: TradeTagUpdate
      }
      trade_templates: {
        Row: TradeTemplate
        Insert: TradeTemplateInsert
        Update: TradeTemplateUpdate
      }
      saved_views: {
        Row: SavedView
        Insert: SavedViewInsert
        Update: SavedViewUpdate
      }
      analytics_snapshots: {
        Row: AnalyticsSnapshot
        Insert: AnalyticsSnapshotInsert
        Update: AnalyticsSnapshotUpdate
      }
      notifications: {
        Row: Notification
        Insert: NotificationInsert
        Update: NotificationUpdate
      }
      user_settings: {
        Row: UserSettings
        Insert: UserSettingsInsert
        Update: UserSettingsUpdate
      }
    }
    Views: Record<string, never>
    Functions: {
      calculate_account_analytics: {
        Args: { p_account_id: string }
        Returns: {
          total_trades: number
          winning_trades: number
          losing_trades: number
          win_rate: number
          profit_factor: number
          avg_rr: number
          total_pnl: number
          max_drawdown: number
        }
      }
      check_rule_violations: {
        Args: { p_account_id: string }
        Returns: {
          rule_name: string
          rule_limit: number
          current_value: number
          is_violated: boolean
        }[]
      }
    }
    Enums: {
      account_type: AccountType
      trade_direction: TradeDirection
      trade_status: TradeStatus
      notification_type: NotificationType
      tag_type: TagType
    }
  }
}
