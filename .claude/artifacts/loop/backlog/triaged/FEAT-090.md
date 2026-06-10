---
id: FEAT-090
status: triaged
priority: P3
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-08
depends_on: []
slices: []
derived_from: null
composite_score: 6
source_competitors: [Aider]
autonomous_safe: false
tags: [telemetry, observability]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.2
pm_effort_estimate: 0.25
pm_strategic_alignment: 0.45
pm_technical_risk: 0.25
pm_dependency_depth: 0.05
triage_notes: "Composite 6. Per-session PostHog-compatible analytics JSONL. Near-exact duplicate of FEAT-118. Impact: 1 in original scoring (lowest tier). Primary use case is opt-in telemetry for Aider's own analytics pipeline — not a loop product need. loop already emits cost-insights artifacts and auto-dispatch.jsonl. PostHog-compatible format implies sending data to a third-party service which is out of scope for a local plugin."
github_issue: 172
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/172"
---
# FEAT-090: Per-session analytics log (local PostHog-compatible JSONL)

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Aider

## Description

--analytics-log writes every tool call, model, and token count to a JSONL file the user controls. loop / crew emit no structured per-session telemetry beyond cost-insights artifacts.

## PM Scoring

```json
{
  "featureId": "FEAT-090",
  "scores": {
    "customer_impact": 0.20,
    "effort_estimate": 0.25,
    "strategic_alignment": 0.45,
    "technical_risk": 0.25,
    "dependency_depth": 0.05
  },
  "compositePriority": "P3",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from Aider audit. No user request for PostHog-compatible JSONL telemetry.",
  "scopeNotes": "Near-exact duplicate of FEAT-118. PostHog compatibility implies a specific schema for an external service — out of scope for a local plugin. The cost-insights artifact already covers per-slice token and cost data. If the need is a machine-parseable local log, that is closer to FEAT-083 (trajectory JSON).",
  "risks": [
    "Near-exact duplicate of FEAT-118",
    "PostHog-compatible implies external service integration — privacy and data residency concerns",
    "Overlap with existing auto-dispatch.jsonl and cost-insights artifacts"
  ],
  "reasoning": "P3: low impact, low demand evidence, overlaps existing telemetry artifacts, PostHog compatibility out of scope."
}
```

## Scoring

- Impact: 1
- Effort: 1
- Fit: 3
- Composite: 6 / 9

## References

- https://aider.chat/docs/more/analytics.html

## Consider rejecting because

Near-exact duplicate of FEAT-118. PostHog-compatible format serves Aider's SaaS analytics pipeline, not a local plugin use case. Existing cost-insights artifacts and auto-dispatch.jsonl already provide machine-readable per-run data. No user has requested this format.
