---
id: FEAT-092
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
tags: [validation, retry, workflow]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.35
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.55
pm_technical_risk: 0.55
pm_dependency_depth: 0.15
triage_notes: "Composite 6. Automated task output guardrails with retry. Near-exact duplicate of FEAT-120. Effort: 2 in original (higher than most). An auto-retry loop without human review could mask systematic failures and waste cost. The existing manual validator gate is intentional — it protects against fabrication (per SLICE-81 grade). Reducing friction at the validator gate risks the quality guarantees the loop is built around."
github_issue: 173
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/173"
---
# FEAT-092: Automated task output guardrails with retry

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- CrewAI

## Description

Tasks define function-based or LLM-based validators that run on output; on failure the agent retries up to guardrail_max_retries times automatically. loop/crew validation is a manual human-gated step with no auto-retry loop.

## PM Scoring

```json
{
  "featureId": "FEAT-092",
  "scores": {
    "customer_impact": 0.35,
    "effort_estimate": 0.55,
    "strategic_alignment": 0.55,
    "technical_risk": 0.55,
    "dependency_depth": 0.15
  },
  "compositePriority": "P3",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from CrewAI audit. Recent grade (SLICE-81) shows manual validator gate caught fabrication twice — evidence that automated retry without human review carries quality risk.",
  "scopeNotes": "Near-exact duplicate of FEAT-120. Function-based validators for loop would require defining a validator schema per AC — substantial design work. LLM-based auto-retry risks cost spiraling if the validator prompt is too strict. Max retry cap and cost guard needed.",
  "risks": [
    "Near-exact duplicate of FEAT-120",
    "Auto-retry loop without human review risks masking systematic failures (SLICE-81 evidence)",
    "Runaway cost if LLM validator keeps rejecting",
    "Requires AC-level validator schema design — significant new contract"
  ],
  "reasoning": "P3: effort/risk exceeds benefit given that manual validator gate is intentional design choice with evidence."
}
```

## Scoring

- Impact: 2
- Effort: 2
- Fit: 3
- Composite: 6 / 9

## References

- https://docs.crewai.com/concepts/tasks

## Consider rejecting because

Near-exact duplicate of FEAT-120. The existing manual validator gate is intentional — SLICE-81 grade shows it caught two builder fabrications that an automated retry loop would have passed through. Auto-retry without human review could increase cost and reduce quality. If auto-retry is added, it must have a hard retry ceiling and emit a halt-badge on exhaustion.
