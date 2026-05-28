---
id: FEAT-005
status: triaged
priority: P2
category: competitor-gap
target_release: null
created: 2026-05-28
updated: 2026-05-28
depends_on: []
slices: []
derived_from: null
composite_score: 7
source_competitors: [Aider]
autonomous_safe: false
triage_notes: no fields needed inference
pm_customer_impact: 0.55
pm_strategic_fit: 0.65
pm_implementation_confidence: 0.7
pm_demand_signal: 0.55
pm_risk_level: 0.35
pm_reasoning: "model-router.mjs handles phase routing; within-task architect/editor split is new command surface — behavioral change, single competitor source"
---
# FEAT-005: Architect / editor two-model split as a built-in command

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Aider

## Description

/architect mode routes planning to a reasoning model and implementation to a cheaper editor model in a single user-transparent step. loop / crew model routing is phase-level; there is no built-in within-task architect-then-editor handoff command.

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://aider.chat/docs/usage/modes.html

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
