# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, hot reload)
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

No test suite is configured.

## Architecture

**Zenso** is an AI brand-visibility analytics SaaS for eCommerce stores. It tracks how AI platforms (ChatGPT, Perplexity, etc.) mention and recommend a brand's products, and surfaces actionable improvement recommendations.

### Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Backend**: Supabase (Postgres + Auth + Realtime + Edge Functions)
- **Data fetching**: TanStack Query + direct Supabase client calls
- **Charts**: Recharts
- **Routing**: React Router v6

### Route structure

```
/                    → DashboardIndex (landing + signup)
/welcome-back        → Auth (sign in)
/auth                → Auth
/onboarding          → Onboarding (collect company name + website, creates profile + store)
/auth/shopify/callback → ShopifyCallback

AppLayout (persistent resizable sidebar):
  /dashboard?tab=<tab>  → Dashboard (tab-driven: overview | products-overview | brand-overview | prompts)
  /product/:productId   → ProductOverview
  /prompt/:promptId     → PromptDetail
  /settings             → Settings
  /overview-draft       → OverviewDraft
```

### AppLayout / outlet context

`AppLayout` wraps all authenticated routes and renders the resizable sidebar + top header. It passes `{ activeStore, setActiveStore }` down via React Router outlet context — child pages access it with `useOutletContext()`. The sidebar width is persisted in `localStorage` under `"sidebar-width"`.

Tab navigation in `Dashboard` is URL-driven: the active tab is read from `?tab=` and changes navigate to `/dashboard?tab=<name>` (except settings which routes to `/settings`).

### Supabase integration

- Client is at `src/integrations/supabase/client.ts` — **auto-generated, do not edit**.
- Types are at `src/integrations/supabase/types.ts` — **auto-generated, do not edit**.
- Import the client: `import { supabase } from "@/integrations/supabase/client";`

Key tables: `profiles`, `stores`, `products`, `product_variants`, `product_scores`, `product_recommendations`, `brand_prompts`, `brand_prompt_responses`, `brand_scores`, `brand_recommendations`, `competitor_analytics`, `competitor_scores`, `user_generated_prompts`.

Edge Functions invoked client-side: `generate-brand-recommendations`, `analyze-competitors`, `brand-analytics`.

Realtime subscriptions are used throughout — follow the existing pattern of subscribing on mount and calling `supabase.removeChannel()` in the cleanup.

### Auth / onboarding flow

1. User lands on `/` → signs up via `SignupForm` (Supabase magic link or email/password).
2. After auth, redirected to `/onboarding` to enter company name + website.
3. Onboarding creates a `profiles` row and a `stores` row, then fire-and-forgets three Edge Function calls.
4. Authenticated users without a store entry are redirected to `/onboarding`; those with one go to `/dashboard`.

### Component directories

- `src/pages/` — route-level page components
- `src/components/` — feature components (modals, charts, tab content)
- `src/components/overview/` — dashboard overview widgets (BrandCard, ProductHealthMetrics, CompetitiveBenchmark, etc.)
- `src/components/ui/` — shadcn/ui primitives; do not modify these files

### Path aliases

`@/` maps to `src/` (configured in Vite + TypeScript).
