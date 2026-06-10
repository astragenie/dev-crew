---
id: FEAT-094
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
source_competitors: [CrewAI]
autonomous_safe: false
tags: [telemetry, observability]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.2
pm_effort_estimate: 0.25
pm_strategic_alignment: 0.45
pm_technical_risk: 0.3
pm_dependency_depth: 0.05
triage_notes: "Composite 6. Post-run usage metrics object. Near-exact duplicate of FEAT-122. Impact: 1 (lowest tier). CrewAI's crew.usage_metrics is an in-process Python object after a programmatic run — this plugin is Markdown/CLI based, not a callable library. The concept does not map directly."
github_issue: 174
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/174"
---
# FEAT-094: Structured post-run usage metrics object

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- CrewAI

## Description

After any crew run, crew.usage_metrics exposes token counts and LLM performance data as a structured object. loop/crew have cost-insights artifacts but no in-process programmatic metrics object accessible after a dispatch.

## PM Scoring

```json
{
  "featureId": "FEAT-094",
  "scores": {
    "customer_impact": 0.20,
    "effort_estimate": 0.25,
    "strategic_alignment": 0.45,
    "technical_risk": 0.30,
    "dependency_depth": 0.05
  },
  "compositePriority": "P3",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from CrewAI audit. cost-insights artifacts already provide per-run token/cost data.",
  "scopeNotes": "Near-exact duplicate of FEAT-122. CrewAI's usage_metrics is an in-process Python object — this plugin is CLI/Markdown-based. The closest equivalent would be a structured JSON output from node scripts/loop.mjs after a run. Existing cost-insights artifacts partially cover this.",
  "risks": [
    "Near-exact duplicate of FEAT-122",
    "Plugin is not a callable library — in-process metrics object does not apply",
    "Existing cost-insights artifacts already provide the data in a different format"
  ],
  "reasoning": "P3: lowest impact score, near-duplicate, concept doesn't map cleanly to CLI plugin architecture."
}
```

## Scoring

- Impact: 1
- Effort: 1
- Fit: 3
- Composite: 6 / 9

## References

- https://docs.crewai.com/concepts/crews

## Consider rejecting because

Near-exact duplicate of FEAT-122. CrewAI's usage_metrics is an in-process Python object returned from a programmatic API call. This plugin is a Claude Code CLI plugin — there is no equivalent in-process object after a slash command invocation. The existing cost-insights artifacts and auto-dispatch.jsonl already provide the underlying data in file form.
