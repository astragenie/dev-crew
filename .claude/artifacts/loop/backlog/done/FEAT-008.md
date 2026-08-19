---
id: FEAT-008
status: done
priority: P2
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-19
depends_on: []
slices: [SLICE-43]
derived_from: null
pm_customer_impact: 0.6
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.6
pm_technical_risk: 0.5
pm_dependency_depth: 0.2
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "Concrete, quantified operational-waste defect (100% idle-ping recurrence) with a bounded fix inside the dispatch loop's own hygiene layer; no schema/contract break, so P2/autonomous-safe."
tags: ["stack:typescript", "area:dispatch-loop", "concern:agent-reporting"]
needs_contract: true
needs_ux: false
started_at: 2026-08-19
slices_complete: [SLICE-43]
completed_at: 2026-08-19
---
## Description

Carried from runner-plugin FEAT-259 (agent SendMessage report-back enforcement) after P0 parent-estate settlement. Three of five slices already shipped in runner-plugin: SLICE-187 (SubagentStop report-gate hook, hooks/report-gate.mjs, shipped default-off with a known prompt-text-proximity false-positive risk documented in FEAT-259.md), SLICE-184 (mandatory final-act SendMessage line across owned agent templates), and SLICE-185 (orchestrator-watchdog decision logic in src/scripts/lib/orchestrator-watchdog.mts, shipped deliberately UNWIRED -- no production caller exists because nothing scriptable in runner-plugin can observe a live subagent idle/stop state; parseChangedPaths there also has a disclosed gap on quoted/renamed git paths that must be hardened before any execution point is added). Remaining scope, cheaper to build once crew and runner share one dispatch loop than to keep coordinating across the seam: (1) the structured receipt schema ({status, items[], commit_shas[], evidence_path, deviations[]}, target <=15 lines) documented and adopted by dispatch prompt templates, and (2) idle-ping suppression -- swallow bare idle_notification pings emitted after a report was already delivered and acknowledged (measured at 100% recurrence, 6-of-6 and 9-of-9 in two separate runner-plugin sessions, distinct from FEAT-259's already-fixed missing-report case) -- wired into the dispatch loop's context-budget hygiene. Note the FEAT's own finding that shipped SLICE-184 and SLICE-187 are independent, not reinforcing: an owned agent's .md template content never reaches the transcript first turn that the report-gate hook scans, so the receipt-schema and idle-suppression work still needs its own real coverage, not just closure.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a dispatched subagent that has already sent a structured receipt ({status, items[], commit_shas[], evidence_path, deviations[]}) and it was acknowledged by the parent, When that subagent later emits a bare idle_notification ping, Then the dispatch loop suppresses it and does not re-inject it into the parent's context.
- AC-2: Given a subagent template updated with the new receipt schema, When the subagent completes its work and sends its final report, Then the report is <=15 lines and contains status, items[], commit_shas[], evidence_path, and deviations[] fields in the documented shape.
- AC-3: Given a subagent that stops WITHOUT ever having sent a structured receipt (the already-fixed missing-report case from SLICE-187), When SubagentStop fires, Then idle-ping suppression does not swallow that stop event -- it must remain distinct from, not a regression of, the report-gate hook's existing behavior.
- AC-4: Given the receipt-schema and idle-suppression code paths, When a test asserts on an agent .md template's static content alone, Then it is treated as insufficient coverage (per the FEAT's own reinforcement-vs-independence finding) -- the AC set must include at least one test that exercises the live transcript-scanning/dispatch-loop path, not template content alone.
