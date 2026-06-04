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
composite_score: 6
source_competitors: [Cursor agents]
autonomous_safe: true
deferred: true
defer_reason: medium-high risk — implement after PR autofix loop ships. Needs depth limit + file-claim system.
triage_notes: no fields needed inference
pm_customer_impact: 0.65
pm_strategic_fit: 0.6
pm_implementation_confidence: 0.25
pm_demand_signal: 0.6
pm_risk_level: 0.85
pm_reasoning: Explicitly deferred — depth limit and file-claim system unresolved; highest risk_level in batch
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
