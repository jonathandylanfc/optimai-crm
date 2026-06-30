# Round 2 — Gate 3 Pre-Deploy Audit — Synthesis

Date: 2026-06-30
Commit: fccf20416cd49ff2c1aa2d4a6af170b9ae9dd307
Type: HIGH-STAKES (Gate 3) — threshold: 4/5
Valid votes: 5/5

---

## Decision Table

| Decision | Claude | Gemini | GPT | DeepSeek [RED-TEAM] | Llama | Mistral | Result |
|----------|--------|--------|-----|---------------------|-------|---------|--------|
| D1 RLS writes | C (=B) | B | B | B | B | B | **B — 5/5 ADOPT** |
| D2 Join type | B | B | B | B | B | B | **B — 5/5 ADOPT** |
| D3 Railway env | A | A | A | A | A | A | **A — 5/5 ADOPT** |
| D4 PAT cleanup | A | A | A | A | A | A | **A — 5/5 ADOPT** |
| **Overall** | AMEND | AMEND | AMEND | AMEND | AMEND | AMEND | **AMEND → ADOPT after fixes** |

Threshold: 4/5 required for Gate 3. Achieved: 5/5 on all decisions.

---

## Actions Required Before Deploy (all binding)

### D1-B — Lock RLS writes to authenticated users [BLOCKER]
Apply migration:
```sql
-- Change all ALL/write policies from qual=true to auth.uid() IS NOT NULL
```
Read policies (SELECT, qual=true) may remain open — read-only demo dashboard is safe.

### D2-B — Fix Array.isArray guard in pipeline.tsx [REQUIRED]
The `rep_id` FK (deals→team_members) is many-to-one. Supabase returns object, not array.
Remove `Array.isArray()` guard, fix type to `{ name: string } | null`.

### D3-A — Verify Railway env vars before deploy [REQUIRED]
Confirm NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Railway dashboard.

### D4-A — Rotate PAT and clean git remote URL [REQUIRED]
Remove embedded PAT from git remote. User must rotate the GitHub PAT at github.com/settings/tokens.

---

## Gate 3 Status
**CLEARED** — all 4 actions must complete, then deploy is authorized by this round.

## Minority notes
None — unanimous on all decisions.

## Next round
Index as Round 2 complete. Gate 3 cleared. Next: Round 3 = post-deploy verification (optional, advisory).
