# Claude Blind Vote — Round 1: Supabase Data-Fetching Architecture
# Written BEFORE external votes. Timestamp enforces §11 step 3.
# Date: 2026-06-30

## D1 — Data-fetching pattern per section

**Vote: B — Hybrid (Server Components for initial load, client hooks for real-time/interactive)**

The CRM currently has `"use client"` on every section and `page.tsx` itself, driven by `useState` for section switching. This is fine for the interactive shell but means ALL data fetching currently happens client-side. The right move is a hybrid: keep the shell client-side but push each section's initial data fetch up to a server component wrapper, then hydrate with client hooks only for sections needing real-time updates (pipeline, deals). Overview, Reports, Forecasting, and Settings can be pure server fetches with no client state.

**Confidence: High**

## D2 — Supabase client placement

**Vote: B — Single shared client in lib/supabase.ts for client components; separate server client (createServerClient from @supabase/ssr) for server components**

The current `lib/supabase.ts` exposes the anon key in the client bundle — acceptable for read-only public data but wrong for any row-level user-specific data. For server components we need `@supabase/ssr` with cookie-based auth. Two clients, clearly separated: `lib/supabase-client.ts` (browser) and `lib/supabase-server.ts` (server only, never imported by client components).

**Confidence: High**

## D3 — Data loading strategy for the 8 sections

**Vote: A — Section-level data fetching (each section fetches its own data independently)**

Avoid a single top-level fetch that pulls all 8 sections' data on mount. Instead each section component fetches exactly what it needs. This enables independent loading states, easier caching per route, and no wasted queries for sections the user never visits. For overview, pre-fetch on server. For pipeline/deals, fetch on client with SWR or React Query for optimistic updates.

**Confidence: High**

## D4 — State management for fetched data

**Vote: B — No global state manager; use React Query (TanStack Query) per section**

Zustand or Context for CRM data would couple sections unnecessarily. TanStack Query gives per-section caching, background refetch, loading/error states, and optimistic mutations — exactly what a CRM needs for deal stage updates and customer edits. Single install, no boilerplate beyond the query functions.

**Confidence: High**

## Overall Vote
**ADOPT Option B hybrid pattern + @supabase/ssr server client + section-level fetching + TanStack Query**

Key risk I'm flagging that externals won't see from code: the anon key is currently `NEXT_PUBLIC_` prefixed and exposed in the browser bundle. This is fine for Supabase's public anon key by design, but only if RLS policies are airtight. We need to confirm RLS is enforced before wiring live data — otherwise any browser user can query any table directly via the exposed URL+key.

## Claude-unique concerns
1. **RLS must be verified before live wiring** — the anon key is public by design but only safe if every table has RLS enabled. Currently unverified in browser.
2. **page.tsx is fully client-side** — section switching via useState means no RSC benefits at the page level. We should keep this but wrap each section in an async server component that passes data as props.
3. **No loading/error states exist anywhere** — every section currently renders hardcoded data with no loading skeleton or error boundary. These must be added as part of the wiring, not after.
