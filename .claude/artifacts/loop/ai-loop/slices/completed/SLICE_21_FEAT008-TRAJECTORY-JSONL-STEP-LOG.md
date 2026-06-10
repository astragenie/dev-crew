---
id: SLICE-21
status: completed
feature: FEAT-008
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-03
updated: 2026-06-03
completed_at: 2026-06-03
github_issue: 40
github_url: "https://github.com/sergeymilashico/loop/issues/40"
---
# SLICE-21: FEAT-008 — Trajectory JSONL step log per slice

## Objective

Add machine-parseable step log per slice. Each ceremony event (slice_start,
slice_complete) appends a JSONL record to `.claude/artifacts/loop/trajectories/<sliceId>-trajectory.jsonl`.

## Deliverables

1. `src/scripts/lib/trajectory-writer.mts` — `recordStep`, `readTrajectory`, `trajectoryPath`
2. `src/scripts/lib/slice-linker/start-slice.mts` — `recordStartTrajectory` helper
3. `src/scripts/lib/slice-linker/complete-slice.mts` — `recordCompleteTrajectory` helper
4. `src/scripts/loop.mts` — `trajectory` subcommand
5. `src/tests/trajectory-writer.test.mts` — 5 tests

## Evidence

- `npm test`: 549/549 pass (+5 new)
- `npm run lint`: clean, zero warnings
- Review: APPROVED (lead review)
- `requires_validation: false`
