---
name: slice-complete
description: Close a slice — move slice file to completed/, feature to done/, auto-roll satisfied specs, suggest grade as next action.
auto_execute_steps: false
---

# Slice Complete

Atomic close ceremony at the end of a slice:

1. **Slice file** — moves from `<slicesRoot>/pending/` (or `active/`) to
   `<slicesRoot>/completed/`. Stamps frontmatter `status: completed`,
   `completed_at: <today>`. If the slice lives flat (LoopBrain-style
   `04-implementation-slices/`), updates frontmatter in place — no move.
2. **Feature file** — finds the slice's `feature: FEAT-NNN` back-ref,
   locates the feature in any backlog state, moves it to
   `docs/backlog/done/`. backlog-writer auto-stamps `completed_at`.
3. **Spec reconcile** — runs `reconcileSpecStatus` so any parent SPEC
   whose derived features are all `done` auto-rolls to `satisfied`.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice complete \
  --repo "$PWD" \
  --id SLICE-NN \
  [--keep-feature-open] \
  [--skip-validation-check "<reason>"]
```

### Validation gate (since v0.5.0)

`slice complete` now refuses to roll the parent feature to `done/` when
**no validation evidence** exists for the slice. The slice itself still
moves to `completed/` (the gate only holds the feature transition,
mirroring the existing blocked / simplify gates).

The gate is satisfied when **any** of these is true:

1. A validation artifact under `.claude/artifacts/crew/validations/`
   whose filename references the slice id (e.g. `*-slice03-*.md`,
   `validation-result-SLICE-03.md`).
2. The crew workflow-state has `currentRun.gates.validation.status` set
   to `passed` or `skipped` (via `crew mark-badge --badge
   validation_passed` or `validation_skipped --note "<reason>"`).
3. The slice file frontmatter contains `requires_validation: false`
   (explicit waiver — use sparingly; intended for doc-only slices).
4. `slice complete` is invoked with
   `--skip-validation-check "<reason>"` (the reason is written to
   workflow-state as a `validation_skipped` badge so the bypass is
   auditable).

When the gate is unmet, the return payload includes:

```json
{
  "feature": {
    "skipped": true,
    "reason": "validation-gate: no validation artifact under ...",
    "validationGate": { "satisfied": false, "reason": "...", "evidence": [] }
  },
  "validationGate": { "satisfied": false, ... }
}
```

The feature stays in `in-progress/`. To unblock, write the validation
artifact (e.g. via `crew write-validation-result`), set the badge, or
re-run with `--skip-validation-check "<reason>"`.

Returns:

```json
{
  "slice": { "id": "SLICE-52", "from": "docs/ai-loop/slices/pending/SLICE_52_X.md", "to": "docs/ai-loop/slices/completed/SLICE_52_X.md" },
  "feature": { "id": "FEAT-001", "from": "docs/backlog/in-progress/FEAT-001.md", "to": "docs/backlog/done/FEAT-001.md" },
  "specStatusChanges": [{ "id": "SPEC-001", "from": "decomposed", "to": "satisfied" }],
  "nextAction": "Run /loop:slice grade --id SLICE-52 to capture lessons + decisions."
}
```

## When to run

After acceptance criteria PASS with evidence and the slice's review +
validation artifacts are in Crew. The complete step is what bridges the
Wiggin Loop iteration to the next slice.

## What to do after

The returned `nextAction` is a literal prompt:

```bash
/loop:slice grade --id SLICE-52
# ...agent fills the grade...
/loop:slice grade-write --id SLICE-52
```

Grading at slice close is what feeds the retrospective + pattern alerts.
Skipping it leaves a hole in the self-improvement signal.

## Aggregation (post-builder fanout)

The `dispatchInstruction` emitted by `slice start` (mode `lead`) now directs the orchestrator to invoke the fanout CLI after builder PASS:

```bash
bun src/scripts/loop.mts slice post-builder-fanout --id <slice-id>
```

This writes a marker file at `.claude/artifacts/loop/fanout-markers/<slice-id>.json` (used by grade telemetry) and emits a 3-task parallel payload. The orchestrator dispatches all three in one message (reviewer-A, reviewer-B, validator). See `commands/slice-post-builder-fanout.md` for the full contract.

Aggregation rules:

- Wait for all three artifacts to land.
- Any reviewer FAIL halts the slice. Validator result preserved (informational).
- Validator FAIL halts the slice. Reviewer results preserved.
- All PASS continues to grade.

The validator prompt does not reference reviewer artifact paths — verdict is based on phase-gate evidence only.

The presence of the marker file is recorded in grade telemetry as `timing.post_builder_fanout: true` when the slice is graded.
