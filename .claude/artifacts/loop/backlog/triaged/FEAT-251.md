---
id: FEAT-251
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.45
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.7
pm_technical_risk: 0.35
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "Contained, one-module (loop.mts) call-site swap onto an already-existing getProvider() resolver in task-store/index.mts; technical_risk 0.35 (top of 0.3-0.5 band: one module, no schema change, explicit behavior-parity test required by the plan itself, clean rollback); realizes the program's headline 'flip provider, zero code edits' AC -> P2."
tags: [refactor, workflow]
needs_contract: false
needs_ux: false
---
## Description

Tracker-provider program Phase 2 — unify tracker path through getProvider. Route the three lifecycle auto-publish sites in loop.mts (backlog add ~1002, spec decompose ~1343, slice-from-feature ~1459 — re-grep anchors, they drift) plus the github setup|publish|feat-publish|status subcommands through getProvider() from src/scripts/lib/task-store/index.mts, instead of direct importGithubSync('github-sync.mjs') calls. Behavior must be identical for github-enabled repos (test). After this FEAT, taskStore.provider in loop.json is the single switch for ALL mirror traffic; only getProvider-resolved providers touch trackers. Independent of the BacklogStore refactor (publish path does not touch backlog-writer). Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.