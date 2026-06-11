---
id: FEAT-167
title: Story-point sizing on FEATs with expected-cost regression formula
status: in-progress
priority: P1
category: workflow/observability
target_release: null
created: 2026-06-09
updated: 2026-06-11
depends_on: [FEAT-166]
slices: [SLICE-97]
derived_from: null
source_competitors: []
autonomous_safe: false
tags: [pm, cost, observability, sizing]
needs_contract: true
needs_ux: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.6
pm_strategic_alignment: 0.85
pm_technical_risk: 0.55
pm_dependency_depth: 0.8
composite_score: 0.635
triage_notes: "Strategic sizing feature unblocking FEAT-168. Risk band 0.3-0.5 leaning 0.6: new effort_points pattern + backfill of done/ FEATs, config-gated formula switch keeps rollback clean. Pre-mortem: Fibonacci mapping table must be validated against 5+ backfilled FEATs (collapse-to-13 risk). Cost analog SLICE-83 + 40 pct backfill overhead = effort 0.60. Weak dimension observability 0.66: needs AC logging expected_usd calc. Dispatch loop:spec-writer for AC-1 contract before slicing. Hard dep FEAT-166."
github_issue: 190
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/190"
started_at: 2026-06-11
---
# FEAT-167: Story-point sizing on FEATs with expected-cost regression formula

## Problem

PM emits `pm_effort_estimate: 0.0–1.0` (an abstract float). The float is not used by the cost-regression check, which compares actual USD against a rolling median across all slices regardless of size. Result: a legitimately large feature (e.g. FEAT-020, 15 tasks, 7 waves, ~$80) trips the regression gate because the median is dominated by smaller slices.

PM scoring is also opaque: 0.85 effort means nothing actionable. There is no obvious threshold that forces decomposition (Thread 3 — see FEAT-168).

## Proposal

Add story-point sizing to FEAT frontmatter and feed it into the regression formula:

```yaml
# new FEAT frontmatter fields
effort_points: 1 | 2 | 3 | 5 | 8 | 13   # Fibonacci sizing emitted by PM during triage
expected_usd: <number>                  # derived: median_usd_per_point × effort_points
```

PM triage emits `effort_points` per the existing 5-dimension scoring (effort estimate maps via a defined table to a Fibonacci value).

`scripts/lib/cost-regression.mjs::checkCostRegression` formula becomes:

```
threshold = expected_usd * multiplier   // not median * multiplier
trip = current_usd > threshold
```

`median_usd_per_point` is computed from completed FEATs (`done/FEAT-*.md` frontmatter has `effort_points` + final aggregate cost). Bootstrap value lives in `.claude/loop.json::loop.costMedianUsdPerPoint` until enough history exists.

## Acceptance criteria

**AC-1: PM effort_estimate → Fibonacci mapping is specified and validated**

Given a PM triage scoring a FEAT with `pm_effort_estimate` (float 0.0–1.0), when the value is committed to frontmatter, then the system SHALL map it to a Fibonacci effort_points value (1, 2, 3, 5, 8, or 13) using the following band boundaries:

| pm_effort_estimate | effort_points |
|---|---|
| 0.0 ≤ x < 0.1 | 1 |
| 0.1 ≤ x < 0.25 | 2 |
| 0.25 ≤ x < 0.4 | 3 |
| 0.4 ≤ x < 0.6 | 5 |
| 0.6 ≤ x < 0.85 | 8 |
| 0.85 ≤ x ≤ 1.0 | 13 |

Validation: `scripts/lib/pm-effort-mapper.mjs::mapEffortEstimateToPoints(0.0–1.0) → 1|2|3|5|8|13` with unit tests in `src/tests/pm-effort-mapper.test.mts` covering all six bands plus boundary cases (0.0, 0.09999, 0.1, 0.24999, etc.). Evidence: test passes and 5+ completed done/FEAT-*.md files are backfilled with effort_points showing a spread of at least three distinct values (not collapse-to-13).

**AC-2: Backfill procedure is testable and preserves existing done/ FEAT structure**

Given 76+ completed FEATs in `.claude/artifacts/loop/backlog/done/`, when `scripts/backfill-effort-points.mjs` is executed interactively (reading stdin for user review), then for each done/FEAT-*.md, the script SHALL:
1. Load current frontmatter (preserving all existing fields)
2. If `effort_points` is missing: prompt user with `pm_effort_estimate` value (if present) and suggested mapped points
3. Accept user input (number 1-13, or "skip") and write to frontmatter or skip
4. Preserve all other frontmatter fields exactly (no clobbering)
5. Exit with summary: X files updated, Y skipped, Z errors

Evidence: test `src/tests/backfill-effort-points.test.mts::backfill-procedure` mocks stdin/stdout and verifies (a) frontmatter merge preserves non-effort fields, (b) multiple FEATs are updated, (c) summary emitted correctly. Run command: `node scripts/backfill-effort-points.mjs < input.txt` produces updated done/ FEAT files with effort_points and no data loss.

**AC-3: Dual-mode regression check logs observability signals on every evaluation**

Given the cost-regression gate (`scripts/lib/cost-regression.mjs::checkCostRegression`), when operating in either mode (`median` or `expected_usd`), then on every call the system SHALL emit a structured log line (stdout or debug logger) with the following fields:

```
{
  "event": "cost-regression-check",
  "timestamp": "2026-06-10T10:15:45.123Z",
  "mode": "expected_usd" | "median",
  "actual_usd": <number>,
  "expected_usd": <number> | null,
  "median_usd_per_point": <number> | null,
  "effort_points": <number> | null,
  "threshold_usd": <number>,
  "triggered": <boolean>,
  "multiplier": <number>,
  "window": <number>,
  "sample_count": <number>
}
```

In `expected_usd` mode: `expected_usd = effort_points × median_usd_per_point`; in `median` mode: `expected_usd = null`. Evidence: test `src/tests/cost-regression-observability.test.mts` captures logged output, parses JSON line, and asserts presence of all fields with non-null sample data. Run command: `npm test -- --grep "cost-regression-observability"` passes with example assertion on two slices (one triggers, one doesn't).

**AC-4: Config-gated transition from median to expected_usd mode**

Given `.claude/loop.json::loop.costRegressionMode` and `loop.costMedianUsdPerPoint`, when `checkCostRegression` runs, then:
- If `costRegressionMode` is explicitly set ("median" or "expected_usd"), use that mode (fail-safe: defaults to "median" if unrecognized)
- If `costRegressionMode` is not set (or null): compute `sampleCount` from done/ FEAT backfill; if `sampleCount >= 3`, auto-flip to "expected_usd" mode and emit one-time log message; otherwise stay on "median"
- `loop.costMedianUsdPerPoint` (bootstrap value, e.g., 12.5 USD/point) is consulted in expected_usd mode and updated after each backfill if sample count >= 3

Evidence: test `src/tests/cost-regression-mode-flip.test.mts::auto-flip-at-3-samples` creates a repo with config.costRegressionMode undefined, writes 2 done/FEAT files (no flip), then 3 files (flip occurs, mode computed to "expected_usd"). Schema validation in `scripts/validate-manifests.mjs` ensures `.claude/loop.json::loop.costRegressionMode` is string|null and `costMedianUsdPerPoint` is number|null.

**AC-5: Small FEAT (1 point) never triggers regression when actual_usd is high; large FEAT (13 points) is safe when actual_usd is high**

Given a completed FEAT with `effort_points: 1` and `median_usd_per_point: 10`, when `expected_usd = 1 × 10 = 10` and `actual_usd = 100` (10× expected), then with `costRegressionMultiplier: 3`, the threshold is `10 × 3 = 30` and `actual_usd (100) > threshold (30)` → regression IS triggered. This is correct: raw cost is truly high.

Given a completed FEAT with `effort_points: 13` and `median_usd_per_point: 10`, when `expected_usd = 13 × 10 = 130` and `actual_usd = 150` (1.15× expected), then threshold is `130 × 3 = 390` and `actual_usd (150) < threshold (390)` → NO regression. This is correct: large FEAT is expected to cost more and is within bounds.

Evidence: test `src/tests/cost-regression-sizing.test.mts` covers both scenarios with assertion on triggering condition (>) not (>=), multiplier applied correctly, and comparison logic sound.

**AC-6: Mode selection and logging visible in integration test of slice close**

Given a slice completion writing an aggregate cost report (`.claude/artifacts/crew/cost/{timestamp}-cost-report-aggregate-{slice}.md` with `usd: 45.0`), when `checkCostRegression` is called during stop-check, then the JSON log line captures the decision (mode, threshold, outcome) and can be queried by test harness.

Evidence: test `src/tests/cost-regression-integration.test.mts::slice-close-regression-check` writes a full slice cost report, mocks 3+ historical reports, calls `checkStopConditions`, and verifies (a) log contains both cost_regression_check event AND stop decision reason, (b) snapshot.costRegression populated with correct mode/threshold/actual. Run: `npm test -- --grep "slice-close-regression-check"` passes.

**AC-7: Lint validation of effort_points and expected_usd frontmatter**

When a FEAT in any state (pending/triaged/in-progress/done) has `effort_points` in frontmatter, the validator SHALL ensure:
1. `effort_points` is an integer in [1, 2, 3, 5, 8, 13]
2. If present, `expected_usd` is a non-negative number
3. If both are present, `expected_usd ≈ effort_points × median_usd_per_point` (within ±0.01 rounding tolerance)

Evidence: `scripts/validate-manifests.mjs` updated with `validateEffortPointsAndExpectedUsd(frontmatter, medianUsdPerPoint)` function. Test `src/tests/manifest-validation-effort.test.mts` covers valid cases, missing effort_points (allowed), invalid Fibonacci (fails), and expected_usd mismatch (fails). Run: `node scripts/validate-manifests.mjs` exits 0 on current backlog; CI gate added to `.github/workflows/test.yml`.

## Out of scope

- Per-slice sizing (this FEAT sizes the FEAT; slice-level breakdown is FEAT-168's concern).
- Architect challenge of PM sizing (existing role already covers).

## Dependencies

- Hard dep on `[[FEAT-166]]` (need per-project USD as input).

## Related

- `[[FEAT-168]]` (slice decomposition gate; uses `effort_points >= 8` as the forcing function).
- `[[FEAT-133]]` (budget enforcement; budget cap can be sized in points rather than USD).
