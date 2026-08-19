---
name: close
description: Close a slice — pre-flight AC evidence check, move slice file to completed/, feature to done/, auto-roll satisfied specs, capture grade and lessons in one atomic ceremony. Subsumes devcrew:slice-grade, devcrew:slice-grade-write, and verification-before-completion pre-flight.
auto_execute_steps: false
---

# devcrew:close

Unified atomic close ceremony at the end of a slice. Replaces three separate
commands (`devcrew:slice-complete`, `devcrew:slice-grade`, `devcrew:slice-grade-write`)
and folds in the verification-before-completion pre-flight.

This command subsumes:

- `devcrew:slice-complete` — move slice + feature files, write handoff + synthesis + cost report
- `devcrew:slice-grade` — capture scores and lessons
- `devcrew:slice-grade-write` — validate + persist grade, extract decisions, emit telemetry
- `verification-before-completion` pre-flight — verify all ACs are checked before ceremony fires

## Flow

```
devcrew:close SLICE-NN [--grade-yaml <path>] [--force-close] ...

→ Pre-flight: check all ACs in slice file are [x] (verified)
→ slice-complete: move slice/feature files, write handoff + final-synthesis + cost-report
→ grade scaffold: create grade file template (or write from --grade-yaml if supplied)
→ slice-grade-write: validate scores, extract decisions, emit telemetry (when --grade-yaml supplied)
→ astramem mirror: record every newly-allocated decision into astramem (see below)
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
  [--skip-validation-check "<reason>"] \
  [--learnings <path-to-learnings.json>] \
  [--learnings-agent <agentType>] \
  [--memories-used <path-to-ids.json>]

# Full single-shot path (autonomous_safe features only)
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice close \
  --repo "$PWD" \
  --id SLICE-NN \
  --grade-yaml <path-to-grade.yaml> \
  [--force-close] \
  [--learnings <path-to-learnings.json>] \
  [--learnings-agent <agentType>] \
  [--memories-used <path-to-ids.json>]
```

### Structured learnings + memory credit (FEAT-263 T2 / Phase 3b, optional)

Two additive, fail-silent inputs — never a new gate, never able to block
the close. Full contract: `docs/sop/memory-bridge.md` § "Structured
learnings + outcome-weighted credit at close".

- **`--learnings <file.json>`** — a JSON array (max 3) of
  `{ type: "lesson"|"decision"|"fact", text: string, why?: string }`
  captured through the existing memory-sink at close, regardless of the
  slice's PASS/FAIL outcome. `--learnings-agent <agentType>` optionally
  overrides the producing-agent attribution (default: derived from the
  slice's own dispatch tags, else omitted).
- **`--memories-used <file.json>`** — a JSON array of memory ids to credit
  (`POST /memory/:id/used` via `feedbackSilent`), batched under one shared
  wallclock budget. Outcome-weighted: skipped entirely when the slice did
  not close with a clean gate PASS, so memories that steered a FAIL are
  never reinforced.

Both respect `memory.enabled: "never"` in `.claude/loop.json` as a full
kill switch, matching every other memory touchpoint in this repo.

## Pre-flight: verification-before-completion

Before the ceremony fires (when `--grade-yaml` is supplied), `devcrew:close`
checks that every acceptance criterion in the slice file is checked off
(`- [x]`). If unchecked ACs are found, it returns an error:

```json
{
  "error": "devcrew:close pre-flight failed: N acceptance criterion/criteria not yet checked off.",
  "missingEvidence": ["- [ ] AC-1: ...", "- [ ] AC-2: ..."]
}
```

To bypass: use `--force-close` (for doc-only slices, infra-only slices, or
when ACs are satisfied by evidence outside the slice file itself).

This is the code-level enforcement of `devcrew:verification-before-completion`
(which remains a prompt-level skill guiding agent behavior).

## Validation gate

`devcrew:close` refuses to roll the parent feature to `done/` when **no
validation evidence** exists for the slice. The slice itself still moves to
`completed/` (the gate only holds the feature transition).

The gate is satisfied when **any** of these is true:

1. A validation artifact under `.claude/artifacts/crew/validations/`
   whose filename references the slice id.
2. The crew workflow-state has `currentRun.gates.validation.status` set
   to `passed` or `skipped`.
3. The slice file frontmatter contains `requires_validation: false`.
4. `devcrew:close` is invoked with `--skip-validation-check "<reason>"`.

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
astramem are separate stores. As of FEAT-217 the mirror is
**code-enforced, not an agent step** — the closing agent does NOT call any
astramem tool manually (doing so would double-write):

- **Decisions** — `grade-writer.mts::extractDecisions` calls
  `memory-sink.mts::recordDecision` for every newly-minted `DEC-NNN` as part of
  `slice-grade-write`. FEAT/SLICE ids are embedded for traceability.
- **Lessons** — `learnings.mts::logLearning` (the `devcrew:learn` store write)
  calls `recordLesson`.

The sink is **opt-in and fail-silent**: it fires only when `memory.enabled` in
`.claude/loop.json` is `on`/`always`/`true` or `auto` (auto = when the
`astramem` CLI resolves); absent/`off` means no mirror. It never throws, never
blocks the close, and caps each spawn at 2s. The astramem project id comes from
`memory.project` (override) else the repo's `productName` — set one of these to
**`runner-plugin`** so slice-close capture and slice-start recall share a project
namespace (see CLAUDE.md § "Memory binding"). Note the id must reach astramem as
a top-level `project` field, not `metadata.project` (the wire client drops the
nested form).

> Manual/one-off decisions authored OUTSIDE a close/learn flow (e.g. an
> architect ADR written mid-slice, or a decision recorded by hand) are the only
> case that still needs a manual mirror — call `astramem remember`
> (`--type decision`) or the astramem `remember` MCP tool for those, since no
> code path runs for them.

## Aggregation (post-builder fanout)

The `dispatchInstruction` emitted by `devcrew:start` (mode `lead`) directs
the orchestrator to invoke the fanout CLI after builder PASS:

```bash
bun src/scripts/loop.mts slice post-builder-fanout --id <slice-id>
```

This writes a marker file at `.claude/artifacts/loop/fanout-markers/<slice-id>.json`
and emits a 3-task parallel payload (reviewer-A, reviewer-B, validator). Wait
for all three artifacts before calling `devcrew:close`.

Aggregation rules:

- Any reviewer FAIL halts the slice.
- Validator FAIL halts the slice.
- All PASS → `devcrew:close`.

## PR-merge detection (DORA pr.merged — FEAT-494 unblock)

`devcrew:close` itself only moves files and grades — it has no git/PR
awareness, and GitHub-native auto-merge completes asynchronously (there is
no in-code "just merged" moment the ceremony can hook). If this slice
shipped through a PR (i.e. the work landed via `devcrew:ship` or any other
PR-filing flow rather than a direct commit to main), the orchestrator
should follow `devcrew:close` with a `pr-watch` call so the `pr.merged`
DORA envelope actually fires once GitHub merges it:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" pr-watch <pr-url> \
  --repo "$PWD" \
  --wait-for-merge \
  --slice-id <slice-id> \
  --feat-id <feat-id>
```

`--wait-for-merge` makes the CLI re-poll for the MERGED transition for a
bounded window after checks go green (`loop.prWatch.postGreenMergePolls`,
default 3, spaced by `pollIntervalSeconds`) before giving up — see
`pr-watch.mts`. Without this flag, `pr-watch` only detects a PR that was
*already* merged before the first poll (the "PR checks all green" exit
does not by itself imply merged). This step is best-effort: skip it for
slices with no PR (local-only ceremonies), and don't let a `pr-watch`
timeout block the close — the slice is already closed by the time this
runs.

Wave-mode's own PR-creation path (`dispatch finalize --pr`, see
`commands/wave.md`) is the other place a `prUrl` is known in-repo; the
same `pr-watch --wait-for-merge` call applies there per-branch.
