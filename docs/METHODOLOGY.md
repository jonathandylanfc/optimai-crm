---
name: Consensus-Driven Build Methodology
version: 1.1
status: binding
effective_date: 2026-06-30
project: OPTIMAI-CRM (Next.js 15.5 + Supabase + Railway)
adapted_from: Original v1.0 (2026-04-20)
consensus_result: 3/5 ADOPT (Round 0 — 2026-06-30)
---

# Consensus-Driven Build Methodology (v1.1)

Adapted from v1.0 for the OptimAI CRM project. Key changes from original:
- Voter count updated from 3 to 5
- Model roster updated to actual deployed models
- Lightweight variant honored via §3 scope rules (Gemini + DeepSeek minority)
- Role specialization adopted unanimously (5/5)

**Round 0 result:** 3/5 ADOPT (GPT, Llama, Mistral), 2/5 AMEND toward lightweight (Gemini, DeepSeek).
Minority preference for lightweight honored in §3 scope restrictions.

---

## 1. Infrastructure

- **Fan-out method:** Python script at `docs/scripts/ask-all.py` calling OpenRouter in parallel threads
- **Keys:** Stored in `~/.claude/settings.json` env block — NEVER in `.env` or repo
- **Audit trail:** Vote files saved to `docs/history/consensus/` per round
- **Stack context:** Next.js 15.5 · Supabase (qzgrzyjnsawtxpyyvmfd) · Railway · shadcn/ui · Tailwind v4

**Pinned models (v1.1):**
- `google/gemini-2.5-pro`
- `openai/gpt-4o`
- `deepseek/deepseek-r1`
- `meta-llama/llama-4-maverick`
- `mistralai/mistral-large`

**Model drift policy:** Pin exact slugs. Run a model roster review quarterly or when OpenRouter announces a deprecation.

---

## 2. Voter structure (5/5 unanimous — D2)

**5 external voters + Claude as judge/synthesizer.**

### Primary role assignments:
| Model | Primary Role | Secondary Role |
|-------|-------------|---------------|
| **Gemini 2.5 Pro** | Architecture & stack decisions | UX/product |
| **GPT-4o** | Code review | Security |
| **DeepSeek R1** | Adversarial / red-team / security | Code review |
| **Llama 4 Maverick** | UX / product decisions | Architecture |
| **Mistral Large** | Format adherence / schema validation | Structure review |

**Binding threshold:**
- Low-stakes rounds: 3/5 votes
- High-stakes rounds (§6): 4/5 votes required
- All 5 vote on Gate 3 and architecture rounds; role-relevant primaries on scoped rounds

**Claude's role:**
1. Writes `round_N_claude.md` BEFORE reading external votes (timestamp enforced)
2. Surfaces Claude-unique concerns (bugs, code-state issues) even when externals approve
3. Synthesizes final decision table
4. Breaks ties per §4

---

## 3. When to invoke consensus

**ALWAYS for:**
- Architecture / stack decisions (database shape, API design, framework)
- Gate 3 (pre-deploy to Railway)
- Gate 2 (post-code-review for major features)
- RLS policy changes or Supabase schema migrations
- Any decision reversing a prior consensus
- High-stakes decisions (§6)
- Any time Claude feels "obviously right" — that is exactly when external voices add value

**NEVER for:**
- Variable renaming
- Bug fixes with a single obvious solution
- Style / Tailwind class tweaks
- Copy changes under 20 words
- Routine Supabase seed data updates
- shadcn/ui component additions that don't affect data layer

*(Lightweight scope honored from Gemini + DeepSeek minority — consensus skipped for code review of routine CRM wiring)*

---

## 4. Tie-break authority

When voters split with no clear majority (e.g., 2-2-1 across 5):
1. **Primary:** Decompose into narrower sub-decisions. A tie usually means the question was overloaded.
2. **Fallback:** Default to the option with the **lowest security/risk profile** — this CRM handles customer PII. Log the forced decision with full rationale and dissent.

---

## 5. Model → task mapping

| Task | Primary Voters | Notes |
|------|---------------|-------|
| Architecture & stack | Gemini, Llama | All 5 vote |
| Code review | GPT, Mistral | Scoped rounds only |
| Security / RLS / auth | DeepSeek (red-team), GPT | All 5 vote on high-stakes |
| UX / product | Llama, Gemini | 3-voter scoped round |
| Format / JSON schema | Mistral, GPT | Scoped rounds only |
| Gate 3 pre-deploy | **All 5** | Always full panel |
| Foundation audit | **All 5** | Always full panel |

**Calibration loop:** After every 10 rounds, audit saved synthesis files to score which model's primary vote was adopted vs. overridden. Adjust from evidence.

---

## 6. High-stakes classification

**High-stakes = any of:**
- Gate 3 (pre-deploy to Railway)
- Touches auth, crypto, or secrets management
- Handles PII or customer data
- Modifies RLS policies or row-level data access
- Supabase schema migrations on live data
- Billing / subscription state
- Modifies this methodology itself

**Low-stakes = everything else** (UI components, non-critical refactors, docs, copy)

High-stakes rounds trigger: DeepSeek adversarial variant (§7), 4/5 binding threshold, mandatory git commit pinning.

---

## 7. Adversarial / red-team policy

**Mandatory on:**
- Every Gate 3 round
- Every high-stakes round (§6)
- Any round touching Supabase RLS or auth

**Mechanics:** DeepSeek R1 receives an appended instruction: *"You are trying to break this design. Assume a motivated attacker targeting a CRM with customer PII. What fails first?"* Other voters receive the standard prompt. DeepSeek's vote is flagged `[RED-TEAM]` in the synthesis table.

---

## 8. Minimum-vote threshold

| Round type | Binding threshold | Fallback |
|-----------|------------------|---------|
| Low-stakes | 3/5 valid votes | 2/5 = advisory only, human sign-off required |
| High-stakes (§6) | **4/5 valid votes** | Retry once, then escalate to human — do not bind |
| Gate 3 | **4/5 valid votes** | Block deploy until resolved |

---

## 9. Security override (locked)

5-LLM consensus **cannot override** a human security expert on any decision touching auth, crypto, secrets, PII handling, data retention, or Supabase RLS. These are `human-authoritative` and consensus output is advisory only.

---

## 10. Round structure

Each round produces a prompt file at `docs/history/consensus/round_N_topic_prompt.md` containing:

1. **ROLE** — "Senior reviewer evaluating [scope] for OptimAI CRM."
2. **CONTEXT** — Stack, what's locked, what's being decided, what is NOT reopening.
3. **DECISIONS** — 1-5 named decisions (D1, D2...). Each has: question, 2-4 options with trade-offs, `new_option` escape hatch.
4. **TASK** — Vote each decision with 2-3 sentence rationale; tag confidence `high/medium/low`; vote overall `ADOPT/AMEND/REJECT`.
5. **FORMAT** — Plain markdown with required section headers (`## D1`, `## D2`, etc.).

---

## 11. Execution flow

1. **Author prompt** → save as `docs/history/consensus/round_N_topic_prompt.md`
   Capture git state: `git rev-parse HEAD > docs/history/consensus/round_N_commit.txt`

2. **Redact before sending.** Scan for: `sk-`, `eyJ`, Supabase URLs, postgres connection strings, customer emails, API keys. Replace with `<REDACTED:TYPE>`.

3. **Claude votes blind** — write `round_N_claude.md` BEFORE running fan-out. File timestamp must precede external vote files.

4. **Parallel fan-out:** Run `docs/scripts/ask-all.py round_N_topic_prompt.md`
   - Wall timeout: `min(10 min, §18 round-type wall timeout)`
   - Per-model soft timeout: 90s with 1 automatic retry on HTTP 5xx / timeout / empty response
   - After retry failure: mark model `UNUSABLE` for the round, continue with remaining voters

5. **Split** raw output into `round_N_gemini.md`, `round_N_gpt.md`, `round_N_deepseek.md`, `round_N_llama.md`, `round_N_mistral.md`

6. **Validate** each vote: required headings present, rationale ≥2 sentences per decision, confidence tags present. Malformed → 1 repair retry. Still broken → mark `UNUSABLE`.

7. **Check threshold** (§8). If below, escalate or mark advisory.

8. **Synthesize** per §12. Produce decision table + minority reports + concerns + ready/not-ready signal.

9. **Document** — append to `docs/history/consensus/INDEX.md`: round #, topic, commit hash, resolution, cost, duration.

10. **Execute** adopted decisions. Update `docs/ARCHITECTURE.md` if architectural contract changed.

---

## 12. Synthesis + minority reports

**Voting math (5-voter):**
- 5/5 agree → adopt, no minority report needed
- 4/5 same option → adopt. Dissenter writes verbatim minority report (2-5 sentences) — not summarized
- 3/5 same option → adopt (low-stakes). Minority report required from both dissenters
- 2-2-1 split → tie-break per §4
- Any `UNUSABLE` voters → apply §8 threshold against remaining valid votes

**Claude's role in synthesis:**
- Flag any Claude-unique concerns (bugs, code-state) even if all 5 externals approved
- Flag synthesis as **forced** if tie-break was required
- Never bury a minority report inside a summary
- If empirical evidence contradicts a consensused assumption, **REOPEN** the decision

---

## 13. Data egress + redaction

Before sending ANY prompt to OpenRouter:
- **Never send:** Supabase service-role keys, anon keys, OAuth secrets, DB connection strings, live customer PII, real email addresses, auth tokens
- **Redact:** Replace with `<REDACTED:KEY>`, `<REDACTED:EMAIL>`, `<REDACTED:URL>` etc.
- **Scan before send:** grep for `sk-`, `eyJ`, `@[^ ]+\.[^ ]+`, `postgres://`, `supabase.co`
- **Bundle scope:** Architecture rounds → NO code bundle. Code review → scoped file list. Security → auth/RLS files only.

---

## 14. Context bundling policy

| Round type | Code bundle |
|-----------|-------------|
| Architecture / design | **None.** Prompt-only. |
| Code review | Scoped file list per concern (max 5 files) |
| Security review | Auth / RLS / Supabase client files only. Never full codebase. |
| Foundation audit | Explicit path list; scoped to relevant CRM sections |
| Gate 3 | Diff from last deploy + ARCHITECTURE.md summary |

---

## 15. Honesty contract (locked)

- Do NOT bury a dissenting vote with strong rationale. Surface it.
- Claude votes independently; if Claude's vote differs from external majority, vote honestly and synthesize transparently.
- If empirical evidence (Supabase query, Railway logs, browser test) contradicts a consensused assumption, REOPEN that decision.
- Track failed predictions in `docs/history/consensus/FAILED_PREDICTIONS.md`
- If 5/5 externals approve but Claude spotted a real bug from code-level context, FLAG IT — do not rubber-stamp.

---

## 16. Anti-patterns

- DO NOT run consensus on trivial decisions (§3 NEVER list)
- DO NOT skip gates because velocity feels urgent
- DO NOT re-litigate consensused decisions — always include "NOT reopening: X, Y, Z" in prompt
- DO NOT treat consensus as ritual — a Claude-unique concern beats 5/5 external approval
- DO NOT dump full CRM codebase into any round
- DO NOT send unredacted Supabase keys or customer data to OpenRouter (§13 is not optional)
- DO NOT allow leading questions — always present neutral baseline + strongest counter-argument + `new_option` escape

---

## 17. Escalation

- **Max 2 rounds per decision.** If unresolved after Round 2, escalate to human with summary of disputes, minority reports, and Claude's recommendation.
- If a high-stakes decision cannot reach 4/5 after retries, escalate immediately.
- `human-authoritative` categories (§9) always advisory.

---

## 18. Cost + latency budgets

| Round type | Token ceiling | $ ceiling | Wall timeout |
|-----------|--------------|----------|-------------|
| Design / architecture | 15k | $0.20 | 5 min |
| Code review (scoped) | 40k | $0.50 | 8 min |
| Foundation audit | 120k | $1.50 | 12 min |
| Gate 3 pre-deploy | 60k | $0.75 | 10 min |
| Ratification (ADOPT/REJECT/AMEND) | 5k | $0.08 | 3 min |

Exceeding ceiling → abort round, re-scope prompt.

---

## 19. CI/CD integration (roadmap)

- Gate 3 round artifacts must exist before Railway deploy is allowed
- Future: `review-crm` as pre-merge check on touched CRM areas (advisory in v1.1)

---

## 20. Methodology versioning

- This document is versioned (v1.0, v1.1...)
- **Amendments require a consensus round**
- Every amendment gets a changelog entry with: round reference, what changed, minority reports

---

## 21. Retirement clause

If after 30 consensus rounds:
- Fewer than 3 round-level disagreements that changed a decision, OR
- Total orchestration time > 8 hrs/week sustained, OR
- Consensus cost > $20/month without catching a real production bug

→ Schedule a methodology retirement review.

---

## 22. Documentation layout

```
docs/
├── METHODOLOGY.md          (this file)
├── ARCHITECTURE.md         (updated by rounds that change contract)
├── scripts/
│   └── ask-all.py          (fan-out script)
└── history/
    ├── README.md           (human-readable log)
    └── consensus/
        ├── INDEX.md        (round table)
        ├── FAILED_PREDICTIONS.md
        ├── round_N_topic_prompt.md
        ├── round_N_raw.txt
        ├── round_N_gemini.md
        ├── round_N_gpt.md
        ├── round_N_deepseek.md
        ├── round_N_llama.md
        ├── round_N_mistral.md
        ├── round_N_claude.md
        ├── round_N_synthesis.md
        ├── round_N_commit.txt
        └── round_N_meta.md  (costs, duration, model IDs)
```

---

## 23. Changelog

### v1.1 — 2026-06-30 (binding)

**Adapted from v1.0 (2026-04-20) for OptimAI CRM project.**

**Round 0 consensus (2026-06-30):**
- D1: 3/5 ADOPT with amendments (GPT, Llama, Mistral) | Minority: Gemini + DeepSeek preferred lightweight variant
- D2: 5/5 unanimous — role-based voter specialization
- D3: 3/5 — Architecture/data-fetching review as first round | Minority: Mistral preferred foundation audit first

**Changes from v1.0:**
- Voter count: 3 → 5
- Model roster: Gemini-3.1-pro / GPT-5.3-codex / GLM-5.1 → Gemini-2.5-pro / GPT-4o / DeepSeek-R1 / Llama-4-Maverick / Mistral-Large
- Binding threshold: 2/3 → 3/5 (low-stakes), 3/3 → 4/5 (high-stakes)
- Role specialization table added (§2, §5) — 5/5 unanimous
- Lightweight scope enforced in §3 NEVER list (Gemini + DeepSeek minority honored)
- Cost/token budgets updated for 5-model fan-out
- DeepSeek R1 designated as primary adversarial/red-team voter

**Minority reports preserved:**
- Gemini + DeepSeek on D1: Lightweight variant preferred for solo-dev velocity
- Mistral on D3: Foundation audit before architecture review ("measure twice, cut once")

**Next round:** Round 1 — Architecture review of Supabase data-fetching strategy
(server components vs client hooks vs API routes for 8 CRM dashboard sections)
