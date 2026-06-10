---
id: FEAT-180
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: []
derived_from: null
autonomous_safe: true
pm_customer_impact: 0.5
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.65
pm_technical_risk: 0.25
pm_dependency_depth: 0.15
composite_score: 0.64
triage_notes: "Verdict schema: not_checked[] list + author/judge separation. Loop side is mechanical prompt + display change; backward-compatible; hero-crew owns the artifact write (upstream-request pattern). Low risk, addresses observability weak dim -> autonomous."
---
# FEAT-180: Review verdict schema: not_checked[] field + author/judge separation

Adopt two AgentOps verdict-schema ideas (schemas/verdict.v1.schema.json, claim-bind levels in C:/work/mega/agentops): (1) review artifacts carry an explicit not_checked[] list — what the reviewer deliberately did NOT cover — killing false confidence from silent scope gaps; (2) evidence/approval records carry separate author_id and judge_id so self-approval is structurally visible.

## Acceptance hints
- Loop side: reviewer-ladder task prompts require a 'Not checked' section; slice link/grade surfaces it.
- Crew side (hero-crew owns write-review-result): file an upstream request doc (docs/upstream-requests/ pattern) proposing --not-checked flag and author/judge fields; loop tolerates artifacts without them (backward compatible).
- Pattern-alert idea: warn when N consecutive reviews have empty not_checked (suspicious).