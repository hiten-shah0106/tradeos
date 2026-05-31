# TradeOS (TradeJournal Pro)

TradeOS is a modern, Notion/Linear-inspired SaaS trading operating system and prop firm tracker built using Next.js 15 (App Router), TypeScript, Zustand, TanStack Query, and Supabase. The visual layout follows the **Stitch Functional Minimalism** design tokens for a sleek, high-contrast, distraction-free trading journal experience.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router with Turbopack) |
| **Language** | TypeScript |
| **Styling** | Vanilla CSS Modules (Stitch monochrome palette, glassmorphism) |
| **State (Server)** | TanStack Query v5 (staleTime: 60s, refetchOnWindowFocus: false) |
| **State (Client)** | Zustand (global layout, notification, and account switcher stores) |
| **Forms** | React Hook Form + Zod validation schemas |
| **Backend / DB** | Supabase (Auth, SSR, PostgreSQL database, Realtime subscriptions) |
| **Charts** | Recharts (Responsive area charts, calendars, weekdays, and session indicators) |

---

## 📐 Project Architecture

```
TradeOS/
├── supabase/                   # Supabase backend DDL and schemas
│   └── migrations/             # Migration SQL files (Schema, RLS, triggers)
├── src/
│   ├── app/                    # Next.js App Router (Layouts, routes, pages)
│   │   ├── (auth)/             # Authentication views (Login, Register layouts)
│   │   ├── (dashboard)/        # Main app dashboard, trades, analytics, settings
│   │   ├── auth/callback/      # OAuth session callback router
│   │   ├── globals.css         # Global Stitch typography & color variables
│   │   └── providers.tsx       # QueryClient & hot-toast provider context
│   ├── components/             # Reusable UI shells (Sidebar, Palette, Bell)
│   ├── hooks/                  # React Query state hooks (Trades, Accounts, Analytics)
│   ├── lib/                    # SDK initializers (Supabase clients, server, middleware)
│   ├── store/                  # Zustand client stores (useAppStore.ts)
│   └── types/                  # TypeScript interfaces and DB schema bindings
```

---

## 💾 Database Schema (Supabase PostgreSQL)

The database consists of **13 core tables** configured with strict Row-Level Security (RLS) policies and automatic plpgsql triggers:

1. **`profiles`**: High-level user profile details.
2. **`accounts`**: Personal, challenge, or funded evaluation trading accounts.
3. **`account_rules`**: Drawdown, consistency, and profit goals configured per account.
4. **`trades`**: Core journal entries storing symbol, lot size, direction, and exit details.
5. **`trade_partials`**: Partial scale-out logs connected to trades.
6. **`trade_images`**: Metadata linking screenshot assets to logged trades.
7. **`tags`**: Custom user-defined or system-level analysis tags.
8. **`trade_tags`**: Many-to-many join connecting trades and tags.
9. **`trade_templates`**: Pre-configured risk profiles to speed up logging.
10. **`saved_views`**: User-defined filtering configurations.
11. **`analytics_snapshots`**: Cached historical performances.
12. **`notifications`**: Auto-generated breach warnings or updates.
13. **`user_settings`**: Layout, theme, and notification preferences.

### PostgreSQL Triggers & Functions (`003_functions.sql`)
- **`handle_new_user()`**: An auth-trigger automatically generating matching `profiles` and `user_settings` rows on signup.
- **`calculate_account_analytics()`**: Computes gross profit factor, streaks, win rate, expectancy, and max drawdowns on demand.
- **`check_rule_violations()`**: Evaluates real-time trades and balance scales against the current account's prop firm guidelines, alerting on breaches.

---

## 🎨 Stitch Design System: Functional Minimalism

The design prioritizes focus, comfort, and sophistication. The theme elements are governable via [**`globals.css`**](file:///c:/Users/hiten/Desktop/TradeOS/src/app/globals.css) custom CSS properties:

- **Level 0 (Base)**: `#0A0A0A`
- **Level 1 (Surface)**: `#111111` (governing sidebars and navigations)
- **Level 2 (Inlay)**: `#171717` (governing card widgets, list items, and modal overlay sheets)
- **Accents**: Pure white `#FAFAFA` for key actions, button highlights, active text indicators, and focus outlines (replacing standard blue/green glows).
- **Outlines**: Separated exclusively by subtle borders (`1px solid #262626`) rather than drop shadows.

---

## 🚀 Getting Started

### 1. Configure the Environment
Ensure your local `TradeOS` directory has the correct `.env.local` variables set up:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://wxtrxvmvshwdcuwggmay.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_anon_key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Build for Production
Verify typescript compiles and next bails are clear:
```bash
npm run build
```
