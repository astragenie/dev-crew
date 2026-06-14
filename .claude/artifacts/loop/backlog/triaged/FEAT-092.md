---
id: FEAT-092
status: triaged
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-13
depends_on: []
slices: []
derived_from: null
composite_score: 0.50
composite_priority: P2
source_competitors: [CrewAI]
autonomous_safe: false
tags: [validation, retry, workflow]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.50
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.65
pm_technical_risk: 0.70
pm_dependency_depth: 0.30
ac_clarity_status: passed
needs_ac_rewrite: false
triage_notes: "Re-scored 2026-06-13 (PHASE C, post-rewrite). FEAT-120 'near-duplicate' claim invalidated — FEAT-120 does not exist in any backlog directory. Rewritten AC (5 GWT + 6 edge cases) is genuinely additive scope. AC-005 fabrication-bypass gate directly addresses SLICE-81 grade evidence (reliability 0.45, validator caught builder fabrication twice). Risk raised to 0.70 — new cross-plugin halt-badges per SPEC-003 (docs/halt-badges.md registry) + schema additions to auto-dispatch.jsonl + new config keys. autonomous_safe=false: cross-plugin halt-badge contract needs human coordination; AC-005 confidence threshold (0.6) needs empirical calibration before it can be autonomous. Effort 0.65 → ~5 Fibonacci points (below FEAT-168 decomposition threshold of 8)."
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

## Acceptance Criteria

**AC-001 — Happy path: validator passes on first attempt**
Given a slice completes (builder/reviewer/validator stage output is available)
And a function-based validator is configured for that stage
When the validator function is invoked and returns `{ pass: true }`
Then no retry is triggered
And the slice continues to the next stage without interruption
And the loop emits no halt-badge for this validator invocation.

**AC-002 — Retry path: validator fails once, passes on second attempt**
Given a slice completes a stage
And a function-based validator is configured with `guardrail_max_retries: 2`
When the validator returns `{ pass: false, reason: "<string>" }` on the first call
Then the loop automatically re-dispatches the stage agent (same role, same slice)
And when the re-dispatched agent completes and the validator returns `{ pass: true }` on the second call
Then the slice advances normally
And an audit entry is written to `.claude/artifacts/loop/auto-dispatch.jsonl` recording `{ sliceId, stage, attempt: 2, outcome: "pass" }`.

**AC-003 — Max retry exhaustion: retries hit ceiling → halt-badge**
Given a slice is in retry for a stage
And `guardrail_max_retries` is set to N (e.g. 2)
When the validator returns `{ pass: false }` on all N+1 attempts (original + N retries)
Then the loop stops retrying
And emits a halt-badge `guardrail-exhausted` in the snapshot with fields `{ sliceId, stage, attempts: N+1, lastReason: "<string>" }`
And requires explicit human review (loop enters `escalated_to_human` state for this slice)
And does NOT auto-promote the next backlog item until the halt is cleared.

**AC-004 — Cost guard: cumulative retry cost checked before each retry**
Given a slice is about to issue retry attempt K (K >= 1)
And the loop has a configured `guardrail_cost_ceiling` (e.g. `$0.50` per slice)
When the estimated cost of the next attempt (previous-attempt token count × model rate) would push cumulative slice cost above `guardrail_cost_ceiling`
Then the loop skips the retry
And emits a halt-badge `guardrail-cost-ceiling` in the snapshot with fields `{ sliceId, stage, attempt: K, cumulativeCostUsd, ceilingUsd }`
And requires human review before any further retry (same `escalated_to_human` flow as AC-003).

**AC-005 — Fabrication-signal bypass: validator detects low confidence → skip auto-retry, surface to human**
Given a validator function returns `{ pass: false, confidence: <number 0–1>, fabricationSuspected: true }`
And `confidence` is below the configured threshold (default `0.6`)
When the loop evaluates the validator result
Then it does NOT issue any automatic retry for this stage
And immediately emits a halt-badge `guardrail-fabrication-suspected` in the snapshot with fields `{ sliceId, stage, confidence, reason }`
And sets `escalated_to_human: true` for this slice
And logs the event to `.claude/artifacts/loop/auto-dispatch.jsonl` with `outcome: "fabrication-bypass"`.

## Edge Cases

- **`guardrail_max_retries: 0`** — treated as "no auto-retry"; any validator failure immediately emits `guardrail-exhausted` and escalates to human. Validator still runs once (the original attempt).
- **Validator function throws / errors** — a validator that throws an exception is treated as `{ pass: false, confidence: 0, fabricationSuspected: false }` with `reason: "validator-error: <exception message>"`. Retry budget is consumed normally; AC-004 cost guard still applies.
- **`guardrail_cost_ceiling` absent / not configured** — cost guard is skipped; only the `guardrail_max_retries` ceiling applies.
- **Stage has no configured validator** — behavior is unchanged from current loop; manual validator gate remains in effect for that stage. Auto-retry MUST NOT activate without an explicit validator configuration.
- **Retry of reviewer stage vs. builder stage** — retry re-dispatches the exact same role agent (e.g. `crew:reviewer` for reviewer stage, `crew:builder` for builder stage). The retry dispatch is recorded in the audit log with `retryOf: <original-dispatch-id>`.
- **Parallel dispatch (fe + be builders)** — if a parallel slice has two builders and the validator is stage-scoped, each sub-agent's output is validated independently; a failure in one does not consume retry budget for the other.
