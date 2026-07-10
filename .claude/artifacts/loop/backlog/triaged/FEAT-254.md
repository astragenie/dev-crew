---
id: FEAT-254
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: [FEAT-251, FEAT-252, FEAT-242]
slices: []
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.6
pm_technical_risk: 0.45
pm_dependency_depth: 0.65
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "Moderate-effort finesse layer reusing the proven PR #406 emitter pattern (technical_risk 0.45, top of 0.3-0.5: known pattern, multiple modules, no schema change to existing data); real DORA-consumer demand (astrarunner lead-time/MTTR) but the highest dependency_depth in this batch (three named blockers, one still in-progress) keeps it P2 pending sequencing."
tags: [workflow, infra]
needs_contract: false
needs_ux: false
---
## Description

Tracker-provider program Phase 5 — autonomous issue flow hooks (finesse pass; watcher heavy lifting stays in FEAT-242/245/246). Three hooks: (a) /runner:close posts close-comment + closes the mirrored issue via getProvider (today only manual github sync reconciles) — evidence-rich close comments (grade summary, PR link) give DORA-grade per-slice traceability; (b) /runner:intake --from-issue accepts Linear issue URLs in addition to GitHub (parse -> provider fetch -> FEAT) — once landed, FEAT-242 watcher reactions calling intake --from-issue make Linear issues watchable findings with zero watcher changes; (c) emit issue.published / issue.closed loop events copying the landed PR #406 pattern exactly: dedicated <kind>-emitter.mts module, payload schema under schemas/loop-events/ + index.json registry entry, shared fanoutEnvelope sink, no-op without webhook config, canonical ts field — gives astrarunner issue open->close timestamps for lead-time/MTTR. SEQUENCING: queue until FEAT-242 (B1) slices close — shared envelope/fanout surface. depends_on: FEAT-251, FEAT-252, FEAT-242. Do NOT build watcher tick, IssueBroker, or cross-repo queue here. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.