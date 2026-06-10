---
id: FEAT-007
status: done
priority: P3
category: competitor-gap
target_release: null
created: 2026-05-28
updated: 2026-06-04
depends_on: []
slices: [SLICE-39]
derived_from: null
composite_score: 7
source_competitors: [Cursor agents]
autonomous_safe: true
triage_notes: no fields needed inference
pm_customer_impact: 0.45
pm_strategic_fit: 0.4
pm_implementation_confidence: 0.5
pm_demand_signal: 0.5
pm_risk_level: 0.5
pm_reasoning: Cursor .mdc glob-attach is IDE-layer concept; no clear mapping to loop/crew Markdown-first rule system + remote import adds network dependency
github_issue: 12
github_milestone: 2
phase: 2
started_at: 2026-06-04
slices_complete: [SLICE-39]
completed_at: 2026-06-04
github_url: "https://github.com/sergeymilashico/loop/issues/12"
---
# FEAT-007: Glob-scoped auto-attach rules with remote import

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Cursor agents

## Description

.mdc rules in .cursor/rules/ auto-attach based on file globs, always-apply flag, or AI relevance inference. Rules can be imported from remote GitHub repos via .cursor/rules/imported/<repoName>/. Four-tier precedence (user < project < team < enterprise).

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://cursor.com/docs/rules

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
