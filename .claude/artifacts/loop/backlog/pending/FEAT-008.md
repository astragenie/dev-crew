---
id: FEAT-008
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
source_competitors: [Devin / SWE-Agent]
autonomous_safe: false
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
