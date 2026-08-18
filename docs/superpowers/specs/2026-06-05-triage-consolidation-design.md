---
title: Triage consolidation — replace regex `/loop:backlog-triage` with PM-first `/loop:triage`
date: 2026-06-05
status: design
---

# Triage Consolidation

## Problem

Two triage surfaces today:

- `/loop:backlog-triage` — regex heuristic, deterministic, ~0ms, $0. Auto-fired by Cross-Slice Continuation HARD RULE.
- `/loop:pm-triage` — LLM-based PM agent, full 5-dim scoring + frameworks (Demand, Scope, Risk). Manual or orchestrator-dispatched.

Regex output is too coarse — final triaged FEATs are unhelpful. Two commands also clutter the public surface. Want one public command that produces PM-quality triage by default, with regex preserved internally as a safety fallback.

## Goals

- One public triage command: `/loop:triage`.
- PM agent always re-scores all pending entries — PM owns truth.
- Regex remains as internal fallback so the autonomous loop never stalls on PM failure.
- Deterministic ID guard prevents PM from scoring fabricated FEAT IDs (defensive — closes a documented failure class).
- Cost guarded per-batch so PM doesn't blow the loop's $15 stop threshold.

## Non-goals

- No change to the `pm-write` CLI subcommand or its frontmatter schema.
- No change to PM scoring dimensions or the 5-dim contract in `agents/pm.md`.
- No change to `/loop:pm-review` or `/loop:pm-decompose` (they stay).
- No retroactive re-scoring of already-`done` FEATs.

## Design

### Surface

| File | Action |
|---|---|
| `commands/pm-triage.md` | Rename → `commands/triage.md`; skill frontmatter `name: loop:triage` |
| `commands/backlog-triage.md` | **Delete** |
| `skills/pm-triage/` | Rename → `skills/triage/`; `SKILL.md` frontmatter `name: loop:triage` |
| `tests/pm-triage-flow.test.mjs` | Rename → `tests/triage-flow.test.mjs` |
| `tests/backlog-triage-autosafe.test.mjs` | Keep — regex unit tests still cover the internal fallback path |
| `.claude/loop/rules.md` Cross-Slice HARD RULE | Reword: call `/loop:triage` instead of `backlog-triage` |
| `CLAUDE.md` Auto-dispatch + Backlog discipline | Update command names |
| `CHANGELOG.md` | Breaking-change entry: `/loop:backlog-triage` removed |

CLI subcommand `node scripts/loop.mjs backlog triage` (regex internals) stays — no public command points at it; called only as fallback.

CLI subcommand `node scripts/loop.mjs backlog pm-write` stays — used by PM agent.

### Internal flow + fallback

New entry-point `scripts/lib/triage-flow.mjs`:

```
triage(repoPath, config):
  1. listBacklog(repoPath) → entries
  2. pending = filter(entries, status="pending")
  3. if pending.empty: return { triaged: 0, results: [] }
  4. ids = pending.map(e => e.id)            # deterministic ID list from disk
  5. try:
       pmResults = await dispatchPmAgent({ ids, repoPath, budget })
       validate: every pmResults[i].id ∈ ids # reject fabricated
       validate: every score ∈ [0,1]
       for each result: pm-write CLI applies frontmatter
       move each entry pending → triaged
       return { triaged: N, results, path: "pm" }
  6. catch (PmError | BudgetExceeded | ValidationFail):
       logFallback(reason, ids)              # warn-severity telemetry
       regexResults = await triagePending(repoPath, config)
       return { triaged: N, results, path: "regex_fallback", fallback_reason }
```

Fallback triggers:

- PM agent dispatch error (timeout / non-zero exit / parse fail)
- PM cost guard exceeded (see Cost guard)
- PM output validation fail: returned id not in disk list, score out of `[0,1]`, missing required field

Schema invariant: both paths write the same frontmatter keys (`pm_*` dims, `priority`, `category`, `autonomous_safe`, `triage_notes`). Regex baselines unknown dims to 0.5. `triage_notes` includes a path tag: `via=pm` or `via=regex_fallback (reason=...)`.

Deterministic ID guard: PM agent prompt receives explicit `ids: [FEAT-NNN, ...]` from disk. Contract: score ONLY these. Results for unlisted ids are rejected at validation. Closes the hallucination class structurally.

### Auto-fire policy

Cross-Slice Continuation HARD RULE in `.claude/loop/rules.md`:

- Before: `node scripts/loop.mjs backlog triage`
- After: `/loop:triage` skill (PM-first, regex fallback on error/budget)

PM always re-scores ALL pending entries on every auto-fire (including previously scored). PM owns truth. Idempotent at frontmatter level: overwrites `pm_*` keys, bumps `updated:`.

### Cost guard

New keys in `.claude/loop.json` (loop config):

```json
"loop": {
  "triageBudgetUsdPerBatch": 5.0,
  "triageBudgetTokensPerBatch": 500000,
  "triageFallbackOnBudgetExceeded": true
}
```

Enforcement (in `triage-flow.mjs`):

1. Before PM dispatch: record cost baseline from cost-advisor.
2. After PM completes: `delta = current - baseline`.
3. If `delta > triageBudgetUsdPerBatch` OR `tokens > triageBudgetTokensPerBatch` → mark `BudgetExceeded`, trigger fallback.
4. Per-FEAT soft cap: warn when any single FEAT scoring exceeds `budget / N` (N = pending count).

Budget is per-batch (one auto-fire run), independent of `costStopThreshold: 15` which gates the whole loop iteration.

### Telemetry

- Every fallback appends to `.claude/artifacts/loop/auto-dispatch.jsonl`:
  ```json
  { "event": "triage_fallback", "reason": "...", "cost_usd": 0.0, "ids": [...] }
  ```
- Pattern-alert at warn severity if fallback rate > 50% over rolling 10 runs — signals PM agent degradation.
- `last_triage_path` field captured at next `/loop:snapshot-memory` regenerate.
- `loop:status` surfaces last triage path + fallback count.

### Failure visibility

- PM error message preserved in the affected FEATs' `triage_notes` so future readers see why baseline scores were used.
- Fallback never silently masks a PM bug — pattern alerts and audit log make it loud.

## Migration

- `CHANGELOG.md` breaking-change entry.
- Find/replace `backlog-triage` across `docs/`, `CLAUDE.md`, README — update to `/loop:triage`.
- Tests: rename + add fallback coverage. Existing regex unit tests cover the internal path unchanged.

## Test plan

- Unit: `triage-flow.test.mjs` — happy path PM, validation reject (fabricated id), budget exceed, PM error → fallback. Each asserts written frontmatter shape + `triage_notes` tag.
- Unit: keep `backlog-triage-autosafe.test.mjs` — regex `triagePending` invariants.
- Integration: end-to-end `/loop:triage` against fixture backlog with 3 pending FEATs (one with stale legacy schema).
- Regression: Cross-Slice Continuation HARD RULE test invokes `/loop:triage` and asserts results land in `triaged/` regardless of PM/fallback path.

## Risk

- PM degradation invisible if fallback succeeds silently → mitigated by warn pattern-alert.
- Cost guard miscalibration could starve PM on large backlogs → tunable via `loop.json`; per-FEAT soft warn helps tune.
- Schema additive change to `triage_notes` (path tag) — readers must tolerate suffix. Verified additive in regex parser.

## Open items

- None — design is implementation-ready.
