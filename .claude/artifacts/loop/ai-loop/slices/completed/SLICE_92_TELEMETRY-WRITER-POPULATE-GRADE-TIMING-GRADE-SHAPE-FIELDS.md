---
id: SLICE-92
title: Telemetry writer — populate grade.timing.* + grade.shape.* fields
status: completed
feature: FEAT-184
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-11
updated: 2026-06-11
github_issue: 205
github_url: "https://github.com/sergeymilashico/loop/issues/205"
validations: [.claude/artifacts/crew/validations/20260611T112631Z-validation-result-feat184-slice92-telemetry-writer-validation.md]
reviews: [.claude/artifacts/crew/reviews/20260611T113048Z-review-result-feat-184-slice-92-grade-telemetry-writer-populate-timing-fie.md, .claude/artifacts/crew/reviews/20260611T113109Z-review-result-feat-184-slice-92-grade-telemetry-writer-populate-timing-fie.md]
completed_at: 2026-06-11
---
# SLICE-92: Telemetry writer — populate grade.timing.* + grade.shape.* fields

Implements FEAT-184. See [feature file](../../../backlog/in-progress/FEAT-184.md) for product context.

## Objective

SLICE-91 (commit fd6fc6b) seeded the grade frontmatter schema with `timing:` and `shape:` blocks, and shipped the `perf-report` CLI to aggregate them. No code writes the fields. `perf-report --window N` returns `medianWallClockSeconds: null`, `phaseGateParallelPct: 0`, `serialReviewerWarningPct: 0`, `inlinePathPct: 0` indefinitely. AC-1 (50% wall-clock reduction) and AC-5 (≥30% inline adoption) from the throughput-2x design are unmeasurable until this lands.

## In scope

- Extend `src/scripts/lib/grade-writer.mts` (`createGradeFile` or new helper) to populate `timing.wall_clock_seconds`, `timing.phase_gate_parallel`, `timing.reviewer_span_ms`, `timing.serial_reviewer_warning` in grade frontmatter before write.
- Read `.claude/logs/loop.jsonl` to compute wall-clock seconds from `slice start` → current grade-write event for `sliceId`.
- Read latest phase-gate validation artifact for the slice to determine `timing.phase_gate_parallel` boolean.
- Re-run `detectSerialReviewer` (from `reviewer-timing.mts`) and persist `reviewer_span_ms` + `serial_reviewer_warning` to grade frontmatter.
- Tests under `src/tests/grade-writer-telemetry.test.mts` covering all 4 fields.

## Out of scope

- `timing.post_builder_fanout` field — depends on FEAT-185 (ceremony wiring); leave null until then.
- `shape.classified` / `shape.inline_path_used` — depends on FEAT-186 (slice-start classifier hook); leave null until then.
- Backfilling telemetry into existing grade files (forward-only).

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint is clean (`bun run lint`, `bun run format:check`).
- [ ] AC-2: `bun src/scripts/loop.mts slice grade --id <slice>` produces a grade file whose frontmatter contains numeric `timing.wall_clock_seconds` (derived from `loop.jsonl`), boolean `timing.phase_gate_parallel`, numeric `timing.reviewer_span_ms`, and boolean `timing.serial_reviewer_warning`.
- [ ] AC-3: `bun src/scripts/loop.mts perf-report --window 1` after grade write returns non-null `medianWallClockSeconds`.
- [ ] AC-4: Re-running grade-write on the same slice is idempotent (identical frontmatter output).
- [ ] AC-5: ≥4 new test cases under `src/tests/grade-writer-telemetry.test.mts` exercising the 4 fields + idempotency.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-184 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
