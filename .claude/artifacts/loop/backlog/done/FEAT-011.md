---
id: FEAT-011
status: done
priority: P1
category: competitor-gap
target_release: null
created: 2026-05-28
updated: 2026-05-28
depends_on: []
slices: [SLICE-08]
derived_from: null
composite_score: 7
source_competitors: [gstack]
autonomous_safe: false
triage_notes: no fields needed inference
pm_customer_impact: 0.7
pm_strategic_fit: 0.8
pm_implementation_confidence: 0.65
pm_demand_signal: 0.65
pm_risk_level: 0.3
pm_reasoning: lessons-feed.mjs already feeds forward grades; JSONL learnings store would compound loop effectiveness but /learn command is new user surface needing SPEC
started_at: 2026-05-28
completed_at: 2026-05-28
github_issue: 16
github_milestone: 1
phase: 1
github_url: "https://github.com/sergeymilashico/loop/issues/16"
---
# FEAT-011: Cross-session learnings with automatic recall

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- gstack

## Description

gstack logs per-project operational learnings as JSONL and auto-surfaces the top 3 at skill start. /learn lets the user review, prune, and export. loop/crew have handoff artifacts but no auto-recalled operational learnings that compound across sessions.

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- C:/Users/serge/.claude/skills/gstack/SKILL.md (preamble learnings block), C:/Users/serge/.claude/skills/gstack/learn/SKILL.md

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
