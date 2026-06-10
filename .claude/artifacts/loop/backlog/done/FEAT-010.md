---
id: FEAT-010
status: done
priority: P2
category: competitor-gap
target_release: null
created: 2026-05-28
updated: 2026-06-05
depends_on: []
slices: [SLICE-36]
derived_from: null
composite_score: 7
source_competitors: [Devin / SWE-Agent]
autonomous_safe: false
triage_notes: no fields needed inference
pm_customer_impact: 0.65
pm_strategic_fit: 0.7
pm_implementation_confidence: 0.6
pm_demand_signal: 0.6
pm_risk_level: 0.4
pm_reasoning: "Prospective confidence signal hooks into slice start ceremony output — user-visible behavioral change, calibration methodology unspecified"
github_issue: 15
github_milestone: 2
phase: 2
started_at: 2026-06-04
slices_complete: [SLICE-36]
completed_at: 2026-06-05
github_url: "https://github.com/sergeymilashico/loop/issues/15"
---
# FEAT-010: Confidence reporting per slice (traffic-light signal)

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Devin / SWE-Agent

## Description

Devin 2.1 introduced confidence reporting using green/yellow/red signals per task, surfaced to the user before and during execution. loop grade system scores retrospectively; no prospective confidence signal is emitted at slice start or mid-execution.

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://cognition.ai/blog (Devin 2.1, 05.15.25)

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
