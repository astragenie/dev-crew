---
feature: FEAT-167
status: active
---
# Run Brief: FEAT167 SLICE97: Story-point sizing: pm-effort mapper + manifest validator (FEAT-167 slice-a)

- Created: 2026-06-11T20:08:02.939Z
- Tier: full
- Goal: Land the **pure additive foundations** for story-point sizing:  1. Deterministic mapping from `pm_effort_estimate` (0.0–1.0 float) to Fibonacci `effort_points` (1|2|3|5|8|13). 2. Manifest-level validation of `effort_points` and `expected_usd` frontmatter fields.  No behavior flip. Cost-regression gate still runs in `median` mode. No FEATs are backfilled. Goal: ship the contract surface so slice-b can backfill against a validated schema and slice-c can flip the regression formula safely.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New module `src/scripts/lib/pm-effort-mapper.mts` exporting `mapEffortEstimateToPoints(value: number): 1|2|3|5|8|13`.
- Unit tests `src/tests/pm-effort-mapper.test.mts` covering all 6 bands + boundary cases (0.0
  - 0.0999
  - 0.1
  - 0.2499
  - 0.25
  - 0.3999
  - 0.4
  - 0.5999
  - 0.6
  - 0.8499
  - 0.85
  - 1.0) + out-of-range guard (negative / >1 → throw).
- New helper `validateEffortPointsAndExpectedUsd(frontmatter
  - medianUsdPerPoint?)` inside `src/scripts/validate-manifests.mts` enforcing:
  1. `effort_points`
  - if present
  - ∈ {1
  - 2
  - 3
  - 5
  - 8
  - 13}.
  2. `expected_usd`
  - if present
  - is a non-negative number.
  3. If both present **and** `medianUsdPerPoint` is supplied
  - `expected_usd ≈ effort_points × medianUsdPerPoint` (±0.01 tolerance).
- Tests `src/tests/manifest-validation-effort.test.mts` covering: missing fields (allo
- Out Of Scope:
  - - AC-2 backfill script (SLICE-98).
- AC-3 cost-regression observability JSON log line (SLICE-99).
- AC-4 config-gated mode flip (SLICE-99).
- AC-5 regression scenario tests (SLICE-99).
- AC-6 integration test of slice-close regression decision (SLICE-99).
- PM agent prompt edits to emit `effort_points` during triage (out — pure infra slice).
- Planned Files: -
- Next Step: Begin implementation

