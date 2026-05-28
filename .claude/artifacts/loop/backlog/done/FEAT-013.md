---
id: FEAT-013
status: done
priority: P2
category: competitor-gap
target_release: null
created: 2026-05-28
updated: 2026-05-28
depends_on: []
slices: [SLICE-07]
derived_from: null
composite_score: 7
source_competitors: [superpowers]
autonomous_safe: true
triage_notes: no fields needed inference
pm_customer_impact: 0.55
pm_strategic_fit: 0.7
pm_implementation_confidence: 0.9
pm_demand_signal: 0.5
pm_risk_level: 0.1
pm_reasoning: "Pure Markdown convention change — no runtime code, no behavioral regression, no new deps; only autonomous_safe FEAT in this batch"
started_at: 2026-05-28
completed_at: 2026-05-28
---
# FEAT-013: Iron Law hard-gate tag convention in skill Markdown

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- superpowers

## Description

Superpowers uses HARD-GATE and EXTREMELY-IMPORTANT XML-like tags in skill Markdown with tested behaviour-shaping efficacy. loop/crew use free-form HARD RULE prose but lack the standardised tag framing that makes violations explicit and self-documenting.

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- skills/brainstorming/SKILL.md, skills/test-driven-development/SKILL.md, skills/verification-before-completion/SKILL.md

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
