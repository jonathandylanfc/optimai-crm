# Round 2 — Gate 3 Pre-Deploy Audit — Claude Blind Vote

Timestamp: 2026-06-30T21:56:34Z (BEFORE external fan-out)
Commit: fccf20416cd49ff2c1aa2d4a6af170b9ae9dd307

---

## D1 — RLS Policy Safety

**Vote: C (Restrict writes immediately before deploy)**

**Rationale:** Current policies have `qual: true` AND `cmd: ALL` — meaning the anon key
(which is embedded in the public NEXT_PUBLIC_ env var) allows full INSERT/UPDATE/DELETE
on all 7 tables including customers, deals, and team PII. This is not a RLS misconfiguration
edge case — this is fully open write access. The app has no auth layer, so any user who
inspects the network tab gets the anon key and can wipe or exfiltrate the entire CRM database.

READ-only open policies are a defensible demo pattern. WRITE-open on PII tables is not.
At minimum, writes must be locked to authenticated users (even if auth is not yet wired to
the UI — the policy can require `auth.uid() IS NOT NULL` which no unauthenticated request
can satisfy, preventing browser console attacks without breaking the current read-only UI).

Confidence: HIGH

---

## D2 — Architecture Implementation Correctness

**Vote: B (ADOPT with one flag)**

**Rationale:** The hybrid RSC + TanStack Query + @supabase/ssr architecture from Round 1 is
correctly implemented:
- lib/supabase-client.ts uses createBrowserClient ✓
- lib/supabase-server.ts uses createServerClient with cookie store ✓
- QueryClientProvider wraps layout.tsx ✓
- All 8 sections wired (Overview fully live, Pipeline/Deals/Customers/Team/Forecasting/Reports with fallback) ✓
- Build clean at 249kB / 357kB First Load JS ✓

One flag: useDeals hook selects `team_members(name)` but the join goes via `rep_id` — need
to verify Supabase returns this as an object or array (schema shows it as FK not array).
In pipeline.tsx I already handled the ambiguity with Array.isArray() guard but the type
annotation should be tightened.

Confidence: HIGH

---

## D3 — Unresolved Bugs Before Deploy

**Vote: B (Two issues must be fixed before deploy)**

Issue 1 (BLOCKER): `use-team.ts` orders by `rank` but null ranks will float to bottom
by default. Minor, but the `nullsFirst: false` parameter I added should handle this.
Actually the real issue: `useTeam` hook joins `deals(id, value, stage)` but revenue
computation happens client-side by summing deal values. If a team member has no deals,
revenue = 0 — correct behavior, no bug. This is fine.

Issue 2 (BLOCKER — see D1): RLS open writes. This is not a code bug but a configuration
blocker that affects the deploy decision.

Issue 3 (WARN): PAT token `<REDACTED:GITHUB_PAT>` embedded in git
remote URL. This should be rotated and the remote URL cleaned before any public push.

Confidence: HIGH

---

## D4 — Railway Deployment Configuration

**Vote: A (ADOPT — ready to deploy after D1/D3 blockers resolved)**

**Rationale:** Railway config appears correct from prior commits:
- PORT env binding: `server: { port: parseInt(process.env.PORT || '3000', 10) }` ✓
- PostCSS/Tailwind v4 config in place ✓
- No standalone output mode (removed in prior fix) ✓
- NEXT_PUBLIC_ env vars in Railway: need to verify NEXT_PUBLIC_SUPABASE_URL and
  NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Railway env (not just .env.local)

Confidence: MEDIUM (can't verify Railway env without dashboard access)

---

## Overall Vote: AMEND

**Deploy is blocked by D1 (open write RLS). Fix RLS writes to require auth.uid() IS NOT NULL,
then Gate 3 is clear to ADOPT.**

The architecture is sound. The build is clean. The only structural blocker is the write-open
database that exposes PII to unauthenticated DELETE/INSERT/UPDATE from any browser.
