---
id: FEAT-085
status: triaged
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-08
depends_on: []
slices: []
derived_from: null
composite_score: 7
source_competitors: [Devin / SWE-Agent]
autonomous_safe: false
tags: [observability, confidence, slice-ceremony]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.40
pm_effort_estimate: 0.30
pm_strategic_alignment: 0.65
pm_technical_risk: 0.30
pm_dependency_depth: 0.10
triage_notes: "Composite 7. Prospective confidence signal (green/yellow/red) at slice start. Near-exact duplicate of FEAT-108. The loop already emits retrospective grades; a prospective signal at slice-start (e.g., based on AC count, dependency depth, and recent grade trend) would be additive. Low effort if implemented as a simple heuristic badge in loop:pm output or slice-start ceremony. autonomousSafe: false — AC not specified."
---
# FEAT-085: Confidence reporting per slice (traffic-light signal)

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Devin / SWE-Agent

## Description

Devin 2.1 introduced confidence reporting using green/yellow/red signals per task, surfaced to the user before and during execution. loop grade system scores retrospectively; no prospective confidence signal is emitted at slice start or mid-execution.

## PM Scoring

```json
{
  "featureId": "FEAT-085",
  "scores": {
    "customer_impact": 0.40,
    "effort_estimate": 0.30,
    "strategic_alignment": 0.65,
    "technical_risk": 0.30,
    "dependency_depth": 0.10
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from Devin 2.1 audit. No direct user feedback. The existing grade snapshot with score averages provides a similar retrospective signal.",
  "scopeNotes": "Near-exact duplicate of FEAT-108. Minimum deliverable: add a confidence field to slice-start output (e.g. computed from AC count, has_depends_on, recent_grade_avg). Could be a 1-line addition to loop brief output. Full mid-execution signal requires instrumentation not currently available.",
  "risks": [
    "Near-exact duplicate of FEAT-108",
    "Prospective confidence based on heuristics may mislead more than inform",
    "Mid-execution signal would require instrumentation hooks beyond current plugin capability"
  ],
  "reasoning": "P2: low effort for a static heuristic slice-start signal; mid-execution variant is out of scope for current architecture."
}
```

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://cognition.ai/blog (Devin 2.1, 05.15.25)

## Consider rejecting because

Near-exact duplicate of FEAT-108. A heuristic confidence score (e.g., "this slice has 8 ACs, depends_on 2 FEATs, recent grade avg 0.85 → yellow") may create false precision. If the heuristic formula is not calibrated against real outcomes, it could undermine user trust rather than build it.
