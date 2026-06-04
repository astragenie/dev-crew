---
id: FEAT-012
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
source_competitors: [gstack]
autonomous_safe: true
triage_notes: no fields needed inference
pm_customer_impact: 0.6
pm_strategic_fit: 0.65
pm_implementation_confidence: 0.55
pm_demand_signal: 0.55
pm_risk_level: 0.6
pm_reasoning: "Auto-commit WIP + ship squash filter touches git history and PR shape — high blast-radius, squash edge cases underspecified"
github_issue: 18
github_milestone: 2
phase: 2
---
# FEAT-012: Continuous checkpoint commits with WIP squash on ship

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- gstack

## Description

With checkpoint_mode continuous, skills auto-commit WIP with a prefix and structured context body (decisions, remaining work, failed approaches). /ship filter-squashes WIP commits before the PR so bisect stays clean. loop/crew have handoff artifacts but no auto-commit safety net for mid-session work.

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- C:/Users/serge/.claude/skills/gstack/README.md (Continuous checkpoint mode section)

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
