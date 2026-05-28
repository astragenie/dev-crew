---
id: FEAT-010
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
# FEAT-010: Confidence reporting per slice (traffic-light signal)

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Devin / SWE-Agent

## Description

Devin 2.1 introduced confidence reporting using green/yellow/red signals per task, surfaced to the user before and during execution. loop grade system scores retrospectively; no prospective confidence signal is emitted at slice start or mid-execution.

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://cognition.ai/blog (Devin 2.1, 05.15.25)

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_
