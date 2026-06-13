---
id: FEAT-165
title: Per-skill cost attribution
status: in-progress
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-13
depends_on: []
slices: [SLICE-115]
derived_from: null
source_competitors: [Trigger.dev, OpenAI Codex]
autonomous_safe: true
tags: [crew, cost, observability]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.55
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.6
pm_technical_risk: 0.25
pm_dependency_depth: 0.1
triage_notes: "NOTE — there is a naming collision: a different FEAT-103 (architect/editor two-model split) was triaged as a duplicate of FEAT-080 in the first batch and lives at triaged/FEAT-103.md. This FEAT (per-skill cost attribution) is a distinct item from the 2026-06-08 positioning audit and carries autonomous_safe: true per its original frontmatter. It is stored here as FEAT-103-per-skill-cost-attribution.md to avoid overwriting the earlier triaged file. Recommend re-numbering this as FEAT-165 or higher when the backlog admin pass runs."
github_issue: 188
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/188"
started_at: 2026-06-13
---
# FEAT-165: Per-skill cost attribution

## Source

2026-06-08 positioning audit §8 CREW-NEXT-3.

## Problem

Crew+Loop's `cost-advisor` tracks per-slice cost. No per-skill attribution. Codex Analytics API surfaces skill-invocation breakdown. Trigger.dev's `usage.getCurrent()` gives per-block attribution. Crew users can't answer "which skill burned my budget this week?"

## Proposal

Extend cost-advisor to bucket spend by skill name (and agent role). Surface report as `crew:brief-me --cost-by-skill` or `loop:brief --cost-by-skill`.

## Acceptance criteria

- `auto-dispatch.jsonl` already captures agent + skill; cost-advisor reads + buckets by `skill_name`.
- New report mode: top-N skills by 4-week average $; surface delta from baseline (current week vs avg).
- Sample output: "crew:reviewer-multidim spent $12.40 in last week, +30% vs 4-week avg."
- Tests: aggregator over synthetic jsonl, delta calculation, output formatter snapshot.

## Out of scope

- Real-time alerts (next slice).

## References

- Trigger.dev usage: https://trigger.dev/docs/run-usage
- Codex Analytics API skill invocations field.
- Existing cost-advisor at `src/scripts/lib/cost-advisor.mts`.

## PM Scoring

```json
{
  "featureId": "FEAT-103",
  "scores": {
    "customer_impact": 0.55,
    "effort_estimate": 0.35,
    "strategic_alignment": 0.60,
    "technical_risk": 0.25,
    "dependency_depth": 0.10
  },
  "compositePriority": "P2",
  "autonomousSafe": true,
  "demandEvidence": "2026-06-08 positioning audit §8 CREW-NEXT-3. Competitor evidence: Trigger.dev usage.getCurrent() per-block, Codex Analytics API skill invocations field. auto-dispatch.jsonl already emits agent+skill data; the aggregation layer is missing.",
  "scopeNotes": "Minimum deliverable: read auto-dispatch.jsonl, bucket by skill_name, surface top-N report. Single module addition to cost-advisor area. ACs are clear and testable. Smallest deliverable is the aggregator + report formatter; the --cost-by-skill flag entry point is independent. Fits in one slice.",
  "risks": [
    "auto-dispatch.jsonl may not reliably capture skill_name across all dispatch paths — needs audit before coding",
    "Naming collision: a previous FEAT-103 (architect/editor two-model split) was triaged in first pass; this item may need renumbering"
  ],
  "reasoning": "P2 autonomous_safe: clear AC, single-module scope, foundational data already in auto-dispatch.jsonl, demand from positioning audit."
}
```

## Consider rejecting because

No strong objection. Narrow scope; data already exists in `auto-dispatch.jsonl`. Only concern is the id collision with the previously-triaged FEAT-103 — recommend renumbering to FEAT-165 in the next backlog admin pass.
