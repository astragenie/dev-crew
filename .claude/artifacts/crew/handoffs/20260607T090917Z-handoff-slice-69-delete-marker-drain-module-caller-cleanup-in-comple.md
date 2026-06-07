# Task Handoff: SLICE-69: Delete marker-drain module + caller cleanup in complete-slice

- Created: 2026-06-07T09:09:17.443Z
- From: builder
- To: lead
- Objective: Deleted marker-drain module (4 files) and stripped all DrainOpts/DrainResult/DrainFn/fireMarkerDrain code from complete-slice — all 7 ACs green.
- Allowed Scope:
  - src/scripts/lib/marker-drain.mts
  - src/tests/marker-drain.test.mts
  - scripts/lib/marker-drain.mjs
  - tests/marker-drain.test.mjs
  - src/scripts/lib/slice-linker/complete-slice.mts
  - src/tests/slice-complete-marker-drain.test.mts (adjusted
  - not deleted)
- Forbidden Scope: -
- Deliverable: 4 files deleted (marker-drain source + compiled + test source + test compiled); complete-slice.mts: removed DrainOpts/DrainResult import, DrainFn type alias, noMarkerDrain/drainFn opts, fireMarkerDrain function and call; slice-complete-marker-drain.test.mts updated to ceremony smoke tests (3 tests preserved with new assertions, no drainFn usage)
- Changed Files:
  - src/scripts/lib/marker-drain.mts (deleted)
  - src/tests/marker-drain.test.mts (deleted)
  - scripts/lib/marker-drain.mjs (deleted)
  - tests/marker-drain.test.mjs (deleted)
  - src/scripts/lib/slice-linker/complete-slice.mts (modified)
  - scripts/lib/slice-linker/complete-slice.mjs (modified)
  - src/tests/slice-complete-marker-drain.test.mts (modified)
  - tests/slice-complete-marker-drain.test.mjs (modified)
- Confidence: high
- Risks: none — mechanical deletion, no new behavior added; drainFn injection path fully removed; the noMarkerDrain CLI opt is now silently ignored (any callers passing it will see no error but also no drain, which is the desired outcome)
- Suggested Next Handoff: SLICE-70 (A2): remove marker-write path inside auto-dispatch.mts

