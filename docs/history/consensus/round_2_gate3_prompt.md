# Round 2 — Gate 3 Pre-Deploy Audit

**ROLE:** Senior reviewer performing a Gate 3 pre-deploy security and quality audit for OptimAI CRM.

**STACK:** Next.js 15.5.19 (App Router) · Supabase (anon key auth) · Railway · TanStack Query v5 · @supabase/ssr · shadcn/ui · Tailwind v4

**COMMIT:** fccf20416cd49ff2c1aa2d4a6af170b9ae9dd307

**WHAT WAS BUILT (since last deploy):**
- 8 dashboard sections wired to live Supabase data via TanStack Query hooks
- Hybrid RSC + browser client split using @supabase/ssr createBrowserClient / createServerClient
- Skeleton loading states on all sections
- Realtime subscription on deals table via supabase.channel()
- Clean production build: 249kB route, 357kB First Load JS

**CRITICAL FINDING — RLS POLICIES:**
All 7 Supabase tables (customers, deals, team_members, revenue_metrics, forecast_data, reports, activities) have the following policy pattern:
- SELECT policy: qual = `true` (anyone can read)
- ALL policy: qual = `true`, with_check = null (anyone can INSERT/UPDATE/DELETE)

The anon key is exposed in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars (required for browser Supabase client). This means any unauthenticated user who inspects network traffic can perform unrestricted writes/deletes on all CRM data including customer PII, deals, and team member records.

**NOT REOPENING:** Architecture pattern (RSC + TanStack Query + @supabase/ssr) — adopted in Round 1, 5/5.

**NOT REOPENING:** Tech stack choices — Next.js, Supabase, Railway — locked in Round 0.

---

## D1 — RLS Write Policy Before Deploy

**Question:** Given the write-open RLS policies (qual=true on ALL cmd), what must happen before Railway deploy?

**Option A — Block deploy, add auth gating first**
Add Supabase Auth (email/password or magic link), gate ALL write policies to `auth.uid() IS NOT NULL`, wire login page. Deploy only after auth is in place.
Trade-off: Correct and complete. Adds 2-4 days of work. Blocks deploy entirely.

**Option B — Lock writes to authenticated users, deploy read-only UI now**
Change ALL write policies to `auth.uid() IS NOT NULL` (no INSERT/UPDATE/DELETE from anon). Keep SELECT policies open (read is safe for a demo CRM with no sensitive prod data). Deploy the current read-only dashboard immediately since no write paths exist in the UI yet.
Trade-off: Eliminates the attack surface. Minimal change. Dashboard still works (all hooks are read-only). Correct security posture for a dashboard-only app.

**Option C — Deploy as-is, add auth in next sprint**
Accept current open RLS as a dev/demo tradeoff. Data is seeded test data, not real customer PII.
Trade-off: Technically defensible for a demo. Any person with devtools can wipe the DB. Violates the security principle established in Round 1.

**Option D — new_option**
Propose an alternative not listed above.

---

## D2 — Code Correctness: Supabase Join Shape

**Question:** The hooks use selects like `team_members(name)` on the deals table (via rep_id FK). Supabase returns FK joins as objects (not arrays) when the FK is many-to-one. The pipeline.tsx component has an `Array.isArray(deal.team_members)` guard. Is this guard correct or a sign of a deeper type mismatch?

**Option A — Guard is correct, keep it**
Supabase can return either shape depending on whether it's a many-to-one or one-to-many FK. The guard is defensive and correct. No change needed.

**Option B — Guard is wrong, fix types**
The `rep_id` FK from deals→team_members is many-to-one: each deal has one rep. Supabase always returns this as an object `{name: "..."}`, never an array. Remove the Array.isArray guard, tighten types to `{ name: string } | null`.

**Option C — Defer, not a blocker**
Whether it's object or array, the UI renders correctly due to the guard. Not worth fixing pre-deploy.

---

## D3 — Deployment Configuration Verification

**Question:** Railway deploy requires env vars to be set in Railway's dashboard (not just .env.local). Should we block deploy until Railway env is verified, or deploy and fix if broken?

**Option A — Verify Railway env before deploy (safe)**
Run `railway variables` or check Railway dashboard to confirm NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set. Block deploy until confirmed.

**Option B — Deploy and verify via Railway logs (fast)**
Push code, Railway builds, if env vars are missing the app will show an error in logs immediately — fix takes 30 seconds. Faster overall than pre-checking.

**Option C — new_option**

---

## D4 — PAT Token in Git Remote URL

**Question:** The git remote URL contains an embedded GitHub PAT `<REDACTED:GITHUB_PAT>`. This token appears in `.git/config` locally. Is this a blocker?

**Option A — Rotate PAT and clean remote URL before pushing**
Revoke the current PAT on GitHub, generate a new one, update the remote URL to use HTTPS without embedding the token (rely on git credential manager instead). Do this before any push.

**Option B — Not a blocker, token is local only**
The PAT is in `.git/config` which is gitignored by default and never pushed to the repo. It's a local-only credential storage. The risk is only if someone gets filesystem access. Clean it up after deploy as housekeeping.

**Option C — new_option**

---

## TASK

Vote on D1, D2, D3, D4. For each:
1. Pick your option letter
2. 2-3 sentence rationale
3. Confidence: high/medium/low

End with overall: ADOPT (deploy is clear), AMEND (deploy after specific fixes), or REJECT (fundamental issues).

## FORMAT
```
## D1
Option: [letter]
Rationale: ...
Confidence: high/medium/low

## D2
Option: [letter]
Rationale: ...
Confidence: high/medium/low

## D3
Option: [letter]
Rationale: ...
Confidence: high/medium/low

## D4
Option: [letter]
Rationale: ...
Confidence: high/medium/low

## Overall: ADOPT/AMEND/REJECT
```
