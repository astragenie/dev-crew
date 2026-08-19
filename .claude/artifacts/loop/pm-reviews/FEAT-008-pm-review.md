---
id: PM-REVIEW-FEAT-008
feature: FEAT-008
reviewed_at: 2026-08-19
pm_customer_impact: 0.6
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.6
pm_technical_risk: 0.5
pm_dependency_depth: 0.2
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-008

## Demand Assessment

- **Evidence:** FEAT body quotes a measured, reproduced defect distinct from the already-fixed missing-report case: bare idle_notification pings emitted after a report was already delivered and acknowledged, at 100% recurrence (6-of-6 and 9-of-9) across two separate runner-plugin sessions. The FEAT's own finding that SLICE-184 (template) and SLICE-187 (report-gate hook) are independent, not reinforcing -- because an owned agent's .md template content never reaches the transcript first turn the hook scans -- means the receipt-schema and idle-suppression work has no existing coverage to lean on.

## Scope Challenge

- **Scope notes:** Two independent deliverables: (1) structured receipt schema ({status, items[], commit_shas[], evidence_path, deviations[]}, target <=15 lines) documented and adopted by dispatch prompt templates, and (2) idle-ping suppression wired into the dispatch loop's context-budget hygiene once a report has been delivered+acknowledged. SLICE-185's orchestrator-watchdog logic (src/scripts/lib/orchestrator-watchdog.mts) ships deliberately unwired with a disclosed parseChangedPaths gap on quoted/renamed git paths -- do not wire an execution point to it as part of this FEAT without first hardening that gap; treat it as out of scope here.

## Scores

- customer_impact: 0.60
- effort_estimate: 0.45
- strategic_alignment: 0.60
- technical_risk: 0.50
- dependency_depth: 0.20

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Concrete, quantified operational-waste defect (100% idle-ping recurrence) with a bounded fix inside the dispatch loop's own hygiene layer; no schema/contract break, so P2/autonomous-safe.

## Risks

- none
