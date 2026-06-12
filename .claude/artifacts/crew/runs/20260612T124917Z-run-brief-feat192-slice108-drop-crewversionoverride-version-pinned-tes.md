---
feature: FEAT-192
status: active
---
# Run Brief: FEAT192 SLICE108: Drop _crewVersionOverride + version-pinned tests (FEAT-192)

- Created: 2026-06-12T12:49:17.135Z
- Tier: full
- Goal: -
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/slice-linker/start-slice.mts` — delete the `_crewVersionOverride?: string | null` declaration from `startSlice` options type.
- `src/tests/slice-start.test.mts`:
  - Delete the FEAT-047 AC-1 test (`'slice-start emits orchestrate-slice when orchestratorMode='orchestrate-slice''`) — covered by slice-build-routing tests.
  - Strip `_crewVersionOverride: "0.9.0"` arg from remaining tests; bodies otherwise unchanged.
- `src/tests/shape-marker.test.mts` — strip `_crewVersionOverride` argument from the two tests that pass it.
- Out Of Scope:
  - - `plugin-identity.test.mts` (live code coverage; stays).
- `MIN_CREW_VERSION` constant.
- Planned Files: -
- Next Step: Begin implementation

