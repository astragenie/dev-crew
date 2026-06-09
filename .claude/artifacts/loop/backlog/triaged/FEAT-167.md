---
id: FEAT-167
title: Story-point sizing on FEATs with expected-cost regression formula
status: triaged
priority: P1
category: workflow/observability
target_release: null
created: 2026-06-09
updated: 2026-06-09
depends_on: [FEAT-166]
slices: []
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

- New frontmatter fields (`effort_points`, `expected_usd`) validated by PM agent emit + loop CLI lint.
- Regression formula updated and gated by config flag for transition (`loop.costRegressionMode: "median" | "expected_usd"`, default `"expected_usd"` once `median_usd_per_point` has 3+ samples).
- Backfill script `scripts/backfill-effort-points.mjs` writes effort_points to existing done/FEAT-*.md (interactive review).
- Tests covering: small FEAT (1 point) safe even when raw USD < median; large FEAT (13 points) safe even when raw USD > median; PM scoring snapshot tests updated.

## Out of scope

- Per-slice sizing (this FEAT sizes the FEAT; slice-level breakdown is FEAT-168's concern).
- Architect challenge of PM sizing (existing role already covers).

## Dependencies

- Hard dep on `[[FEAT-166]]` (need per-project USD as input).

## Related

- `[[FEAT-168]]` (slice decomposition gate; uses `effort_points >= 8` as the forcing function).
- `[[FEAT-133]]` (budget enforcement; budget cap can be sized in points rather than USD).
