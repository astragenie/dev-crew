---
id: SLICE-69
status: completed
feature: FEAT-069
phase: 3
priority: P2
target_release: v0.26.0
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
completed_at: 2026-06-07
---
# SLICE-69: A1 — delete marker-drain module + caller in complete-slice

Implements FEAT-069 step A1. See [feature file](../../../backlog/in-progress/FEAT-069.md) for product context.

## Objective

Delete `src/scripts/lib/marker-drain.mts` plus its paired test
`src/tests/marker-drain.test.mts`, and remove the unused import / type
alias inside `src/scripts/lib/slice-linker/complete-slice.mts`. The
marker-queue dispatch path was deprecated by DEC-011; this slice clears
the first of several dead-code targets.

## In scope

- Delete `src/scripts/lib/marker-drain.mts`
- Delete `src/tests/marker-drain.test.mts`
- Delete the matching compiled artifacts under `scripts/` and `tests/`
- Remove the `DrainOpts`, `DrainResult`, and `DrainFn` references in
  `src/scripts/lib/slice-linker/complete-slice.mts`
- Update any other caller surfaced by `grep -rn "marker-drain\|drainPendingDispatchMarkers"`
- Keep CI green: `npm run typecheck`, `npm run lint`, `npm test`

## Out of scope

- Marker-write path inside `auto-dispatch.mts` (covered by SLICE-A2)
- One-shot migration modules (covered by SLICE-A3)
- Any tsconfig flag change or type tightening (Phase B)
- Any perf work (Phase C)

## Acceptance criteria

- [ ] AC-1: `npm test` passes; test count drops by exactly the count
      from the deleted `marker-drain.test.mts` file. No other test
      regresses.
- [ ] AC-2: `npm run typecheck` exits 0.
- [ ] AC-3: `npm run lint` exits 0.
- [ ] AC-4: `grep -rn "marker-drain\|drainPendingDispatchMarkers" src tests scripts` returns no matches.
- [ ] AC-5: `src/scripts/lib/slice-linker/complete-slice.mts` has no
      `DrainOpts`, `DrainResult`, or `DrainFn` reference.
- [ ] AC-6: Net file count diff: -4 files
      (`src/scripts/lib/marker-drain.mts`,
      `src/tests/marker-drain.test.mts`, and their `.mjs` build outputs).
- [ ] AC-7: `/loop:slice complete` and `/loop:slice start` behavior
      unchanged when run end-to-end on this repo.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-069 stays in `in-progress/` (additional slices A2, A3 remain)
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A — correctness focus: verify every caller was updated, the
  removed type alias has no remaining import, the build artifacts are
  cleaned, and CI is green.
- Reviewer B — scope focus: confirm the diff is limited to A1 — no
  Phase B / Phase C work crept in, no opportunistic refactors, no
  changes to public CLI surface.
