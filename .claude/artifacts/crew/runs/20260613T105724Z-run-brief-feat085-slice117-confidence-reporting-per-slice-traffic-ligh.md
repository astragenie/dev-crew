---
feature: FEAT-085
status: active
---
# Run Brief: FEAT085 SLICE117: Confidence reporting per slice (traffic-light signal)

- Created: 2026-06-13T10:57:24.314Z
- Tier: full
- Goal: Competitor gap audit (2026-05-28). Surfaced by:
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Add `sliceStartConfidence` field to `buildBrief` return in `src/scripts/lib/brief.mts`
- Call `computeConfidence` from `confidence-signal.mts` with `acCount=1` sentinel
  - `autonomousSafe`
  - `recentGradeAvg`
  - `dependsOnCount` from top triaged feature
- Add ≥3 test cases in `src/tests/brief.test.mts` covering null (no triaged)
  - green
  - yellow
  - red cases
- Out Of Scope:
  - - Modifying `confidence-signal.mts` logic or types
- Parsing FEAT body for AC count (deferred to future FEAT)
- Planned Files: -
- Next Step: Begin implementation

