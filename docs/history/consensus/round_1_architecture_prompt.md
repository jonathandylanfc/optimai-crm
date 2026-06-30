# ROLE
Senior full-stack reviewer evaluating the Supabase data-fetching architecture for the OptimAI CRM project.

# CONTEXT
**Project:** OptimAI CRM — Next.js 15.5 App Router + Supabase (PostgreSQL + RLS) + Railway + shadcn/ui + Tailwind v4
**Live URL:** https://optimai-crm-production.up.railway.app
**Stage:** UI is fully built and deployed. All 8 dashboard sections render hardcoded mock data. Supabase backend schema is implemented (7 tables: deals, customers, team_members, revenue_metrics, pipeline_stages, activities, forecast_data). Next phase: wire all 8 sections to live Supabase data.

**Current architecture (relevant facts):**
- `app/page.tsx` is a Client Component (`"use client"`) using `useState` for section switching
- All 8 section components (`overview`, `pipeline`, `deals`, `customers`, `team`, `forecasting`, `reports`, `settings`) are Client Components with hardcoded data
- `lib/supabase.ts` exports a single browser client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- No data fetching exists anywhere — all values are hardcoded arrays/objects
- No loading states, error boundaries, or suspense boundaries exist
- RLS is configured in Supabase but browser-level enforcement is unverified

**NOT reopening:** Stack (Next.js + Supabase + Railway), UI component library (shadcn/ui), deployment platform.

# DECISIONS TO VOTE ON

## D1 — Primary data-fetching pattern
- **A: Pure client-side** — Keep all sections as Client Components, fetch data with useEffect + supabase client. Simple, consistent with current architecture.
- **B: Hybrid** — Keep the interactive shell (page.tsx) client-side, but wrap each section in a Server Component that fetches initial data and passes as props. Client components handle real-time/interactive updates only.
- **C: Full RSC** — Restructure page.tsx to use Next.js dynamic routing per section (/dashboard/overview, /dashboard/deals etc.), enabling full server-side data fetching per route.

## D2 — Supabase client strategy
- **A: Single client** — Keep one shared `lib/supabase.ts` (browser client) used everywhere. Simple. Anon key is public by design.
- **B: Split clients** — `lib/supabase-client.ts` for browser components, `lib/supabase-server.ts` using `@supabase/ssr` for server components. Proper auth cookie handling for server-side.
- **C: API routes** — All Supabase calls go through Next.js API routes (`/api/deals`, `/api/customers` etc.), never calling Supabase directly from components.

## D3 — Data loading granularity
- **A: Section-level** — Each section fetches its own data independently when rendered. No shared data layer.
- **B: Top-level prefetch** — Single data fetch at the dashboard root that pulls all needed data upfront and passes down via props or context.
- **C: On-demand with caching** — Fetch data per section using TanStack Query (React Query) for caching, background refresh, and optimistic updates.

## D4 — Real-time updates strategy
- **A: None for now** — Wire static data first, add real-time later as a separate phase.
- **B: Supabase Realtime** — Use `supabase.channel()` subscriptions for live pipeline/deals updates.
- **C: Polling** — Refresh key sections (pipeline, deals) every 30s with `refetchInterval`.

# TASK
Vote each decision (D1-D4) with:
- Your chosen option (A, B, or C)
- 2-3 sentence rationale
- Confidence: high / medium / low
- Overall vote: ADOPT (proceed with your choices) / AMEND (proceed with changes) / STOP (do not proceed)

Flag any concerns specific to this CRM setup.

# FORMAT
## D1
[option + rationale + confidence]

## D2
[option + rationale + confidence]

## D3
[option + rationale + confidence]

## D4
[option + rationale + confidence]

## Overall Vote
[ADOPT / AMEND / STOP + 1-2 sentences]

## Concerns
[Any flags specific to this project]
