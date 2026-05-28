---
id: FEAT-006
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
source_competitors: [Cursor agents]
autonomous_safe: false
triage_notes: no fields needed inference
pm_customer_impact: 0.7
pm_strategic_fit: 0.75
pm_implementation_confidence: 0.55
pm_demand_signal: 0.65
pm_risk_level: 0.55
pm_reasoning: Plan Mode aligns with loop intent but adds user-approval gate touching slice start ceremony — user-visible behavioral contract needs SPEC first
---
# FEAT-006: Plan Mode with codebase-research pre-flight

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Cursor agents

## Description

Before writing any code, Plan Mode runs a codebase research pass, asks clarifying questions, generates an editable Markdown plan, and only executes after explicit user approval. Plans can be saved to workspace for team sharing.

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://cursor.com/docs/agent/plan-mode

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
