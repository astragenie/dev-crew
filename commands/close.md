---
name: close
description: Close a slice — pre-flight AC evidence check, move slice file to completed/, feature to done/, auto-roll satisfied specs, capture grade and lessons in one atomic ceremony. Subsumes runner:slice-grade, runner:slice-grade-write, and verification-before-completion pre-flight.
auto_execute_steps: false
---

# runner:close

Unified atomic close ceremony at the end of a slice. Replaces three separate
commands (`runner:slice-complete`, `runner:slice-grade`, `runner:slice-grade-write`)
and folds in the verification-before-completion pre-flight.

This command subsumes:

- `runner:slice-complete` — move slice + feature files, write handoff + synthesis + cost report
- `runner:slice-grade` — capture scores and lessons
- `runner:slice-grade-write` — validate + persist grade, extract decisions, emit telemetry
- `verification-before-completion` pre-flight — verify all ACs are checked before ceremony fires

## Flow

```
runner:close SLICE-NN [--grade-yaml <path>] [--force-close] ...

→ Pre-flight: check all ACs in slice file are [x] (verified)
→ slice-complete: move slice/feature files, write handoff + final-synthesis + cost-report
→ grade scaffold: create grade file template (or write from --grade-yaml if supplied)
→ slice-grade-write: validate scores, extract decisions, emit telemetry (when --grade-yaml supplied)
→ astramem mirror: record every newly-allocated decision into cortex (see below)
→ Returns { handoffPath, synthesisPath, costUsd, grades }
```

## Ceremony steps

1. **Slice file** — moves from `<slicesRoot>/pending/` (or `active/`) to
   `<slicesRoot>/completed/`. Stamps frontmatter `status: completed`,
   `completed_at: <today>`. If the slice lives flat (LoopBrain-style
   `04-implementation-slices/`), updates frontmatter in place — no move.
2. **Feature file** — finds the slice's `feature: FEAT-NNN` back-ref,
   locates the feature in any backlog state, moves it to
   `docs/backlog/done/`. backlog-writer auto-stamps `completed_at`.
3. **Spec reconcile** — runs `reconcileSpecStatus` so any parent SPEC
   whose derived features are all `done` auto-rolls to `satisfied`.
4. **Grade scaffold** — creates a grade template file. When `--grade-yaml`
   is supplied and the parent FEAT is `autonomous_safe: true`, validates
   + writes the grade scores, extracts decisions, emits telemetry.

Usage:

```bash
# Scaffold-only path (fill grade template manually, then run grade-write)
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice close \
  --repo "$PWD" \
  --id SLICE-NN \
  [--keep-feature-open] \
  [--skip-validation-check "<reason>"]

# Full single-shot path (autonomous_safe features only)
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice close \
  --repo "$PWD" \
  --id SLICE-NN \
  --grade-yaml <path-to-grade.yaml> \
  [--force-close]
```

## Pre-flight: verification-before-completion

Before the ceremony fires (when `--grade-yaml` is supplied), `runner:close`
checks that every acceptance criterion in the slice file is checked off
(`- [x]`). If unchecked ACs are found, it returns an error:

```json
{
  "error": "runner:close pre-flight failed: N acceptance criterion/criteria not yet checked off.",
  "missingEvidence": ["- [ ] AC-1: ...", "- [ ] AC-2: ..."]
}
```

To bypass: use `--force-close` (for doc-only slices, infra-only slices, or
when ACs are satisfied by evidence outside the slice file itself).

This is the code-level enforcement of `runner:verification-before-completion`
(which remains a prompt-level skill guiding agent behavior).

## Validation gate

`runner:close` refuses to roll the parent feature to `done/` when **no
validation evidence** exists for the slice. The slice itself still moves to
`completed/` (the gate only holds the feature transition).

The gate is satisfied when **any** of these is true:

1. A validation artifact under `.claude/artifacts/crew/validations/`
   whose filename references the slice id.
2. The crew workflow-state has `currentRun.gates.validation.status` set
   to `passed` or `skipped`.
3. The slice file frontmatter contains `requires_validation: false`.
4. `runner:close` is invoked with `--skip-validation-check "<reason>"`.

## Returns

```json
{
  "handoffPath": ".claude/artifacts/crew/handoffs/...-complete.md",
  "synthesisPath": ".claude/artifacts/crew/runs/...-final-synthesis.md",
  "costUsd": 0.42,
  "grades": {
    "gradePath": ".claude/artifacts/loop/grades/...-grade.md",
    "scaffoldOnly": false,
    "writeGradeResult": { "gradePath": "...", "sliceId": "SLICE-52", "scoresAverage": 0.85, ... }
  },
  "complete": { ... },
  "grade": { ... },
  "scaffoldOnly": false
}
```

## Decision + lesson mirror to astramem (automatic — FEAT-217)

The repo decision store (`.claude/artifacts/loop/decisions/DEC-*.md`) and
astramem (cortex) are separate stores. As of FEAT-217 the mirror is
**code-enforced, not an agent step** — the closing agent does NOT call any
astramem tool manually (doing so would double-write):

- **Decisions** — `grade-writer.mts::extractDecisions` calls
  `memory-sink.mts::recordDecision` for every newly-minted `DEC-NNN` as part of
  `slice-grade-write`. FEAT/SLICE ids are embedded for traceability.
- **Lessons** — `learnings.mts::logLearning` (the `runner:learn` store write)
  calls `recordLesson`.

The sink is **opt-in and fail-silent**: it fires only when `memory.enabled` in
`.claude/loop.json` is `on`/`always`/`true` or `auto` (auto = when the
`astramem` CLI resolves); absent/`off` means no mirror. It never throws, never
blocks the close, and caps each spawn at 2s. The cortex project id comes from
`memory.project` (override) else the repo's `productName`.

> Manual/one-off decisions authored OUTSIDE a close/learn flow (e.g. an
> architect ADR written mid-slice, or a decision recorded by hand) are the only
> case that still needs a manual mirror — call `astramem remember`
> (`--type decision`) or the astramem `remember` MCP tool for those, since no
> code path runs for them.

## Aggregation (post-builder fanout)

The `dispatchInstruction` emitted by `runner:start` (mode `lead`) directs
the orchestrator to invoke the fanout CLI after builder PASS:

```bash
bun src/scripts/loop.mts slice post-builder-fanout --id <slice-id>
```

This writes a marker file at `.claude/artifacts/loop/fanout-markers/<slice-id>.json`
and emits a 3-task parallel payload (reviewer-A, reviewer-B, validator). Wait
for all three artifacts before calling `runner:close`.

Aggregation rules:

- Any reviewer FAIL halts the slice.
- Validator FAIL halts the slice.
- All PASS → `runner:close`.
