---
id: SLICE-95
title: Marathon session-scope checkpoint — mandatory retrospective every N slices
status: completed
feature: FEAT-181
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-11
updated: 2026-06-11
github_issue: 211
github_url: "https://github.com/sergeymilashico/loop/issues/211"
reviews: [.claude/artifacts/crew/reviews/20260611T123759Z-review-result-feat181-slice95-expose-checkpointdue-sliceclosessincecheckpo.md]
completed_at: 2026-06-11
---
# SLICE-95: Marathon session-scope checkpoint — mandatory retrospective every N slices

Implements FEAT-181. See [feature file](../../../backlog/in-progress/FEAT-181.md) for product context.

## Objective

Adopt the AgentOps coherent-arc session-scope rule (AGENTS-WORKFLOW.md in C:/work/mega/agentops): 2-4 atomic arcs per autonomous session; at >=5 a post-mortem checkpoint is mandatory. Loop marathon mode is currently unbounded (iteration cap advisory only) — drift accumulates unobserved across a long backlog walk.

## In scope

- Add `loop.marathonCheckpointEvery` config knob to `.claude/loop.json` (default `4`). Document in schema.
- Track in-session slice-close count. Persist to `.claude/state/marathon-checkpoint.json` with `{ sliceCloseCount, lastCheckpointAt, sessionStartedAt }`. Increment on `slice complete`.
- Extend `src/scripts/lib/stop-conditions.mts` with `checkpointDue` reason:
  - `sliceCloseCount === marathonCheckpointEvery` → `severity: warn`, reason `marathon-checkpoint-recommended`.
  - `sliceCloseCount >= 2 × marathonCheckpointEvery` → `severity: halt`, reason `marathon-checkpoint-required`.
  - Counter resets when `/loop:retrospective` runs (record `lastCheckpointAt`).
- Expose `checkpointDue: boolean` + `sliceClosesSinceCheckpoint: number` in `bun src/scripts/loop.mts stop-check` JSON.
- ≥4 new test cases in `src/tests/marathon-checkpoint.test.mts`.

## Out of scope

- Modifying `/loop:retrospective` behavior (existing command stays).
- Multi-session aggregation.
- Backfilling counter from existing grade history at install time.

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint/format clean (`bun run lint`, `bun run format:check`).
- [ ] AC-2: After `slice complete`, `.claude/state/marathon-checkpoint.json` exists with incremented `sliceCloseCount`.
- [ ] AC-3: When `sliceCloseCount === marathonCheckpointEvery` (default 4), `bun src/scripts/loop.mts stop-check` returns `checkpointDue: true` AND a reason with `severity: warn` matching `/marathon-checkpoint-recommended/`.
- [ ] AC-4: When `sliceCloseCount >= 2 × marathonCheckpointEvery` (default 8), `stop-check` returns `severity: halt` and `loop auto` halts with `stopReason` containing `marathon-checkpoint-required`.
- [ ] AC-5: ≥4 new test cases in `src/tests/marathon-checkpoint.test.mts` covering counter increment, warn threshold, halt threshold, retrospective reset.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-181 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
