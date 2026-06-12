---
id: SLICE-108
title: Drop _crewVersionOverride + version-pinned tests (FEAT-192)
status: completed
feature: FEAT-192
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
completed_at: 2026-06-12
---
# SLICE-108: Drop _crewVersionOverride + version-pinned tests (FEAT-192)

Closes FEAT-192. Mechanical removal of dead code path + orphan tests.

## In scope

- `src/scripts/lib/slice-linker/start-slice.mts` — delete the `_crewVersionOverride?: string | null` declaration from `startSlice` options type.
- `src/tests/slice-start.test.mts`:
  - Delete the FEAT-047 AC-1 test (`'slice-start emits orchestrate-slice when orchestratorMode='orchestrate-slice''`) — covered by slice-build-routing tests.
  - Strip `_crewVersionOverride: "0.9.0"` arg from remaining tests; bodies otherwise unchanged.
- `src/tests/shape-marker.test.mts` — strip `_crewVersionOverride` argument from the two tests that pass it.

## Out of scope

- `plugin-identity.test.mts` (live code coverage; stays).
- `MIN_CREW_VERSION` constant.

## Acceptance criteria

- [ ] AC-1: All tests pass + lint clean + tsc clean.
- [ ] AC-2: `grep -rnE '_crewVersionOverride' src/` returns no matches.
- [ ] AC-3: slice-start.test.mts test count drops by at least 1.
- [ ] AC-4: shape-marker.test.mts tests pass without the no-op arg.

## Done When

- All AC PASS.
- bun test green.
- FEAT-192 moves to done.

## Reviewer ladder

- Reviewer A: grep confirms zero remaining refs to `_crewVersionOverride`.
- Reviewer B: removed tests didn't carry unique coverage.
