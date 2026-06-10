---
id: FEAT-008
status: done
priority: P2
category: competitor-gap
target_release: null
created: 2026-05-28
updated: 2026-06-03
depends_on: []
slices: [SLICE-21]
slices_complete: [SLICE-21]
started_at: 2026-06-03
derived_from: null
composite_score: 7
source_competitors: [Devin / SWE-Agent]
autonomous_safe: false
triage_notes: no fields needed inference
pm_customer_impact: 0.5
pm_strategic_fit: 0.6
pm_implementation_confidence: 0.75
pm_demand_signal: 0.55
pm_risk_level: 0.25
pm_reasoning: telemetry.mjs JSONL infrastructure already exists; schema design for step-records needs deliberate spec work before autonomous dispatch
github_issue: 13
github_milestone: 2
phase: 2
completed_at: 2026-06-03
github_url: "https://github.com/sergeymilashico/loop/issues/13"
---
# FEAT-008: Trajectory JSON -- machine-parseable step log per run

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Devin / SWE-Agent

## Description

SWE-Agent emits a structured JSON file per run recording every agent action, tool call, observation, and generated patch. This enables training data generation, offline replay, and objective performance analysis. loop/crew artifacts are prose markdown handoffs and review results -- not machine-parseable step logs.

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://github.com/SWE-agent/SWE-agent (v1.1.0 release, trajectory datasets)

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
