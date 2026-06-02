---
id: FEAT-014
status: done
priority: P1
category: competitor-gap
target_release: null
created: 2026-05-28
updated: 2026-06-02
depends_on: []
slices: [SLICE-09]
derived_from: null
composite_score: 7
source_competitors: [superpowers]
autonomous_safe: false
triage_notes: no fields needed inference
pm_customer_impact: 0.65
pm_strategic_fit: 0.8
pm_implementation_confidence: 0.8
pm_demand_signal: 0.55
pm_risk_level: 0.15
pm_reasoning: High strategic fit with existing validation gate; Iron Law framing is new artifact type for this repo — needs SPEC despite low technical risk
github_issue: 21
github_milestone: 2
phase: 2
started_at: 2026-06-02
completed_at: 2026-06-02
---
# FEAT-014: Evidence-before-claims verification gate as a named skill with evidence table

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- superpowers

## Description

verification-before-completion is a named skill with an Iron Law (NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE) and a table mapping each claim type to the required command evidence. loop/crew have a validation gate at slice close but no named skill enforcing the evidence table before any success claim mid-task.

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- skills/verification-before-completion/SKILL.md

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
