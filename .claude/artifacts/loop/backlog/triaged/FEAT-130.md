---
id: FEAT-130
status: triaged
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-08
depends_on: []
slices: []
derived_from: null
composite_score: 6
source_competitors: [OpenHands]
autonomous_safe: false
tags: [safety, halt-badge, loop-detection]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.45
pm_effort_estimate: 0.50
pm_strategic_alignment: 0.70
pm_technical_risk: 0.45
pm_dependency_depth: 0.15
triage_notes: "Composite 6. Runtime stuck-detector + iterative-refinement primitive. High strategic alignment — the loop's primary failure mode is silent runaway cost without detection (the costRegression halt-badge catches it post-hoc). A stuck-detector that emits a halt-badge when the builder is cycling without progress would be additive. Extends halt-badge infrastructure. autonomousSafe: false — needs architect design for stuck detection heuristics (what constitutes a loop?)."
---
# FEAT-130: Runtime stuck-detector + iterative-refinement primitive

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- OpenHands

## Description

OpenHands ships a Stuck Detector that auto-handles timeout/loop scenarios, plus an Iterative Refinement loop where the agent refines work based on critique feedback. loop has phase-gate failures and grade scoring but no in-slice loop-detection primitive -- a builder that gets stuck retries silently until cost-advisor catches it post-hoc. A `loop:stuck-check` + escalation-to-human badge wired into auto-dispatch would close this.

## PM Scoring

```json
{
  "featureId": "FEAT-130",
  "scores": {
    "customer_impact": 0.45,
    "effort_estimate": 0.50,
    "strategic_alignment": 0.70,
    "technical_risk": 0.45,
    "dependency_depth": 0.15
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from OpenHands audit. costRegression halt-badge catches runaway spend post-hoc; a pre-emptive stuck detector would reduce wasted spend.",
  "scopeNotes": "Minimum: snapshot.stuckDetected halt-badge that fires when (a) current slice has exceeded N retries without a PASS gate, or (b) the same error appears in consecutive validator runs. Wire into stop-conditions.mts following halt-badges.md pattern. Iterative refinement is a separate, higher-scope slice.",
  "risks": [
    "Defining 'stuck' heuristic is non-trivial — false positives halt valid work",
    "Retry count tracking requires new workflow-state.json fields",
    "Must update halt-badges.md registry in same slice",
    "Iterative refinement adds significant scope"
  ],
  "reasoning": "P2: real pain (silent runaway), extends proven halt-badge infrastructure, but stuck heuristic definition is non-trivial."
}
```

## Scoring

- Impact: 2
- Effort: 2
- Fit: 3
- Composite: 6 / 9

## References

- https://docs.openhands.dev/llms.txt (Stuck Detector + Iterative Refinement)
- docs/halt-badges.md — existing halt-badge pattern to follow

## Consider rejecting because

Defining a stuck detector heuristic is harder than it looks — a builder making multiple attempts at a hard problem looks identical to a builder cycling in an infinite loop. False positives would halt valid work. The costRegression halt-badge already provides a post-hoc signal. If the primary concern is silent runaway, tightening costRegressionMultiplier in loop.json may be sufficient without a new badge.
