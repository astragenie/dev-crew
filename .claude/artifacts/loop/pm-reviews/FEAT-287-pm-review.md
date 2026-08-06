---
id: PM-REVIEW-FEAT-287
feature: FEAT-287
reviewed_at: 2026-08-06
pm_customer_impact: 0.65
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.8
pm_technical_risk: 0.5
pm_dependency_depth: 0.25
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-287

## Demand Assessment

- **Evidence:** none

## Scope Challenge

- **Scope notes:** none

## Scores

- customer_impact: 0.65
- effort_estimate: 0.55
- strategic_alignment: 0.80
- technical_risk: 0.50
- dependency_depth: 0.25

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: This is the same defect class as FEAT-281 (P1: tested/gated-but-not-actually-covered) one level up, and arguably worse in one respect: FEAT-281's gap was passive (a function nobody called), while this gate actively prints 'OK — no raw backlog-state writers outside BacklogStore/allowlist' on every run while a live writer bypasses it and has already produced a confirmed external-facing bug (FEAT-285's six duplicate GitHub issues). That combination — false assurance plus a demonstrated live consequence — puts customer_impact and strategic_alignment above FEAT-285 (P2, the symptom) and FEAT-282 (P2, an orphan validator nobody currently relies on and that blocks nothing), but effort and risk are real and multi-file (porting a live external-side-effecting write path, not just widening a scan glob), which is why this sits at P1 alongside FEAT-281 rather than climbing to P0: like FEAT-283, this touches gate-adjacent/live-external-effect code, so autonomous_safe is false pending human sign-off on the port-vs-allowlist calls for the two secondary writers.

## Risks

- none
