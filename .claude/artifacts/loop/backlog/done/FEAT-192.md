---
id: FEAT-192
status: done
slices_complete: [SLICE-108]
completed_at: 2026-06-12
priority: P1
category: tech-debt
target_release: null
created: 2026-06-12
updated: 2026-06-12
depends_on: []
slices: [SLICE-108]
derived_from: null
autonomous_safe: true
tags: [tech-debt, tests]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.55
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.7
pm_technical_risk: 0.2
pm_dependency_depth: 0.05
composite_score: 0.62
composite_priority: P1
triage_notes: "Greenfield test surface reduction. _crewVersionOverride was already a no-op as of 2026-06-11; tests passing it still exercise dead history. Risk 0.2: pure deletion of dead test code + no-op option from signature."
github_issue: 229
started_at: 2026-06-12
---
# FEAT-192: Drop _crewVersionOverride + version-pinned tests

## Problem

`startSlice` carries a `_crewVersionOverride` option that's been a no-op since 2026-06-11 (legacy useOrchestrateSlice fallback removed). Four tests in `src/tests/slice-start.test.mts` + two in `src/tests/shape-marker.test.mts` still pass the option, exercising history that no longer exists. They make the test suite slower and noisier without adding live-code coverage.

We're greenfield + working on system stability; legacy version coverage is dead weight.

## Proposal

1. Remove `_crewVersionOverride` from `startSlice`'s option type.
2. Drop tests whose entire purpose is asserting version-pinned behavior (FEAT-047 AC-1 / AC-3).
3. Strip the `_crewVersionOverride` argument from tests that pass it but actually exercise other behavior.

## Acceptance criteria

**AC-1**: All tests pass + lint clean + tsc clean.

**AC-2**: `grep -rnE '_crewVersionOverride' src/` returns no matches.

**AC-3**: `src/tests/slice-start.test.mts` test count drops by the orphans (FEAT-047 AC-1 + AC-3 tests deleted).

**AC-4**: `src/tests/shape-marker.test.mts` still passes — `_crewVersionOverride` argument stripped, the test bodies otherwise untouched.

**AC-5**: `startSlice` signature no longer declares `_crewVersionOverride`.

## Out of scope

- Dropping `plugin-identity.test.mts` tests covering `compareSemver` / `getCrewVersion` — those exercise live code and stay.
- Touching `MIN_CREW_VERSION` itself.

## Refs

- `src/scripts/lib/slice-linker/start-slice.mts:328-332` (no-op option declaration).
- `src/tests/slice-start.test.mts` (4 uses).
- `src/tests/shape-marker.test.mts` (2 uses).
