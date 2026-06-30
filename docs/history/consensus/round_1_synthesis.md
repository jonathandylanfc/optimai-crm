# Round 1 Synthesis — Supabase Data-Fetching Architecture
# Date: 2026-06-30
# Valid votes: 5/5 (Gemini partial but D1 clear; D2-D4 from 4 full votes)

## Decision Table

| Decision | Result | Threshold |
|----------|--------|-----------|
| D1: Hybrid Server+Client Components | **ADOPTED — 5/5** | Binding |
| D2: Split Supabase clients (@supabase/ssr for server) | **ADOPTED — 4/4** | Binding |
| D3: TanStack Query for on-demand caching | **ADOPTED — 4/4** | Binding |
| D4: Supabase Realtime for pipeline/deals | **ADOPTED — 4/4** | Binding |

## Architecture Contract (execute this)

### D1 — Hybrid pattern
- `app/page.tsx` stays as Client Component (section switcher via useState)
- Each section gets an async Server Component wrapper that fetches initial data
- Client components receive data as props, use TanStack Query for mutations/updates
- Add Suspense boundaries + loading skeletons at section level

### D2 — Split Supabase clients
- `lib/supabase-client.ts` — browser client (existing, renamed)
- `lib/supabase-server.ts` — server client using `@supabase/ssr` createServerClient
- Never import server client in "use client" files

### D3 — TanStack Query
- Install: `@tanstack/react-query`
- Wrap app in `QueryClientProvider`
- Each section uses `useQuery` for reads, `useMutation` for writes
- Cache keys: `['deals']`, `['customers']`, `['pipeline']` etc.

### D4 — Supabase Realtime
- Scope: pipeline stage changes + deal status updates only (Phase 1)
- Use `supabase.channel()` inside useEffect with cleanup
- Overview section: polling every 60s (not realtime — aggregate data)

## Unanimous concerns (all 5 voters + Claude)
1. **RLS BLOCKER** — Verify RLS enforcement in browser before wiring live data
2. **Error boundaries** — Add to all sections before data wiring
3. **Loading states** — Skeletons required; none currently exist
4. **Cross-section cache invalidation** — Define strategy for deal↔pipeline↔customer consistency

## Minority report
- **Claude on D4:** Preferred deferring Realtime to Phase 2 (static data first, real-time as follow-on). Overridden 4/4 by externals. Preserved here. Compromise: implement Realtime only for pipeline + deals in Phase 1, defer overview/team/forecasting to Phase 2.

## Next action
Execute this architecture across all 8 sections. Gate 3 (pre-deploy) requires a new consensus round once implementation is complete.
