---
id: FEAT-083
status: done
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-10
depends_on: []
slices: [SLICE-90]
derived_from: null
composite_score: 7
source_competitors: [Devin / SWE-Agent]
autonomous_safe: false
tags: [observability, telemetry, artifacts]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.35
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.6
pm_technical_risk: 0.35
pm_dependency_depth: 0.1
triage_notes: "Composite 7. Machine-parseable JSON step log per run. Existing auto-dispatch.jsonl is partial coverage but records only dispatch events, not full tool-call observations. Near-exact duplicate of FEAT-106. Primary use case (training data generation) is outside scope of this plugin's product description. Observability scores in recent grades average 0.756 flagged as warning — but existing gap is lack of runtime telemetry hooks, not absence of replay-format logs."
github_issue: 166
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/166"
started_at: 2026-06-10
slices_complete: [SLICE-90]
completed_at: 2026-06-10
---
# FEAT-083: Trajectory JSON -- machine-parseable step log per run

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Devin / SWE-Agent

## Description

SWE-Agent emits a structured JSON file per run recording every agent action, tool call, observation, and generated patch. This enables training data generation, offline replay, and objective performance analysis. loop/crew artifacts are prose markdown handoffs and review results -- not machine-parseable step logs.

## PM Scoring

```json
{
  "featureId": "FEAT-083",
  "scores": {
    "customer_impact": 0.35,
    "effort_estimate": 0.40,
    "strategic_alignment": 0.60,
    "technical_risk": 0.35,
    "dependency_depth": 0.10
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from SWE-Agent audit. auto-dispatch.jsonl partially covers this but records dispatch events only, not full observation streams.",
  "scopeNotes": "Near-exact duplicate of FEAT-106. Minimum deliverable: extend auto-dispatch.jsonl schema to include step-type, input_tokens, output_tokens per dispatch event. Full tool-call observation logging would require instrumentation hooks not currently available in Claude Code's tool API.",
  "risks": [
    "Near-exact duplicate of FEAT-106",
    "Full tool-call observation stream requires Claude Code API support that may not be available",
    "Training data use case is outside scope of this plugin",
    "Log files could grow large; no rotation policy defined"
  ],
  "reasoning": "P2: observability alignment, but primary use case (training/replay) is out of scope; Claude Code tool-observation API coverage uncertain."
}
```

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://github.com/SWE-agent/SWE-agent (v1.1.0 release, trajectory datasets)

## Consider rejecting because

Near-exact duplicate of FEAT-106. Training data generation and offline replay are SWE-Agent product goals not aligned with this plugin's single-developer-tool mission. The existing auto-dispatch.jsonl already provides an audit trail for cost attribution. Full tool-call observation logging would require Claude Code platform-level instrumentation beyond what the plugin can instrument.
