# Vote: deepseek (deepseek/deepseek-r1)

## D1  
**Vote: B (Hybrid)**  
Hybrid leverages both Server Components for efficient initial data fetching and Client Components for interactivity. This balances performance benefits (reduced client JavaScript, faster initial load) while matching the existing client-driven navigation. Pure client-side (A) forgoes Next.js optimizations, and full RSC (C) requires disruptive routing changes.  
**Confidence:** High

## D2  
**Vote: B (Split clients)**  
Server components require a cookie-authenticated `supabase-server.ts` client via `@supabase/ssr` for security and RLS compliance, while client components retain the existing browser client. A single client (A) breaks server-side auth, and API routes (C) add unnecessary indirection since Supabase handles REST internally.  
**Confidence:** High  

## D3  
**Vote: C (On-demand with caching)**  
TanStack Query enables declarative data fetching, caching, background refreshes, and shared state across sections (e.g., pipeline/deal updates). Section-level (A) causes duplicate requests, while top-level prefetch (B) slows initial loads by fetching irrelevant data. Caching optimizes perceived performance.  
**Confidence:** Medium  

## D4  
**Vote: B (Supabase Realtime)**  
For a CRM, live pipeline/deal updates are critical. Supabase Realtime (via PostgreSQL changes) fits natively with the stack and scales better than polling (C). Skipping real-time (A) delays a core value-add, but prioritization by section (e.g., real-time only for deals/pipeline) is feasible.  
**Confidence:** Medium  

## Overall Vote  
**ADOPT**  
The hybrid strategy (B-B-C-B) optimizes Next.js and Supabase synergies: Server Components for efficiency, split clients for security, TanStack for state/caching, and real-time for CRM-specific dynamism. Incrementally implement per section to de-risk.  

## Concerns  
1. **RLS Testing**: Verify server-client auth flows enforce RLS, especially for server components.  
2. **Resource Contention**: Realtime subscriptions may strain browser resources if overused—target critical sections first.  
3. **Complexity Spike**: TanStack + realtime introduces new patterns; scaffold robust error/loading states upfront.  
4. **Data Dependencies**: If sections share entities (e.g., Customers ↔ Deals), define a cache-invalidation strategy.
