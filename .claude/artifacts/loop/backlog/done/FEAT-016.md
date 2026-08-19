---
id: FEAT-016
status: done
priority: P2
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: []
slices: [SLICE-36]
derived_from: null
pm_customer_impact: 0.45
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.55
pm_technical_risk: 0.35
pm_dependency_depth: 0.2
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: Bounded execution of an already-completed audit with a documented plan to follow and an existing CI gate (validate-agent-refs) already positioned to catch incomplete merges; P2/autonomous-safe.
tags: ["stack:markdown", "area:plugin-surface", "concern:command-consolidation"]
needs_contract: false
needs_ux: false
started_at: 2026-08-19
slices_complete: [SLICE-36]
completed_at: 2026-08-19
---
## Description

Command surface audit execution: merge the 7 near-duplicate command pairs and cut the 1 dead command identified in the P3 command audit (see docs/planning/unification-plan.md section 2 command map); each merged command keeps one canonical name + a hard-break stub note in CHANGELOG; validate-agent-refs stays green.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the 7 near-duplicate command pairs identified in docs/planning/unification-plan.md section 2, When each pair is merged, Then exactly one canonical command name remains per pair and the non-canonical name is removed (not aliased).
- AC-2: Given a command removed as part of a merge or as the 1 identified dead command, When CHANGELOG.md is updated, Then it contains a hard-break stub note (no silent shim) naming the removed command and its canonical replacement where applicable.
- AC-3: Given the full set of merges and the one deletion, When `bun ./src/scripts/validate-agent-refs.mts` runs, Then it passes with zero phantom crew:/runner:/devcrew: dispatch tokens left referencing a removed command.
- AC-4: Given a command that had no near-duplicate and was not the dead command, When the merge work completes, Then it is left untouched -- no scope creep beyond the 7 pairs plus 1 deletion named in the audit.
