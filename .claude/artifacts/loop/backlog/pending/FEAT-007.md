---
id: FEAT-007
status: pending
priority: P1
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
