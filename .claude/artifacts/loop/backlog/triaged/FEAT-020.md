---
id: FEAT-020
status: triaged
priority: P3
category: competitor-gap
target_release: null
created: 2026-05-28
updated: 2026-05-28
depends_on: []
slices: []
derived_from: null
composite_score: 0.71
composite_priority: P2
source_competitors: [Cursor agents]
autonomous_safe: true
deferred: true
defer_reason: medium-high risk — implement after PR autofix loop ships. Needs depth limit + file-claim system.
pm_customer_impact: 0.55
pm_effort_estimate: 0.85
pm_strategic_alignment: 0.60
pm_technical_risk: 0.85
pm_dependency_depth: 0.70
pm_strategic_fit: 0.60
pm_risk_level: 0.85
pm_implementation_confidence: 0.25
pm_demand_signal: 0.6
pm_reasoning: Explicitly deferred — depth limit and file-claim system unresolved; highest risk_level in batch
triage_notes: "PM re-scored 2026-06-05 for scale normalization: prior composite_score=6 was a raw 0-9 legacy value that broke walker numeric-sort against current 0.0-1.0 composites. Re-scored under the canonical five dimensions; composite 0.71; formula yields composite_priority=P2 (impact<0.7, alignment<0.8). User-facing priority=P3 kept. deferred=true and defer_reason preserved verbatim. autonomous_safe=true preserved; note formula would compute false (technical_risk, effort, dependency_depth all >0.6) — deferred flag is the active walker gate per FEAT-040 risk-gate fix."
github_issue: 22
github_milestone: 2
phase: 2
---
# FEAT-020: Async hierarchical subagent dispatch

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Cursor agents

## Description

Parent agents spawn child subagents that execute in parallel and asynchronously; subagents can spawn their own children. Enables concurrent multi-file features and large refactors without blocking the parent.

## Scoring

- Impact: 2
- Effort: 2
- Fit: 3
- Composite: 6 / 9

## References

- https://cursor.com/changelog/2-5

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
