---
id: FEAT-012
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.35
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.35
pm_technical_risk: 0.15
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "Trivial single-file doc cleanup with a concretely-traced cause; all dimensions score low, landing at the formula's default P2 band despite being intuitively low-stakes -- flagged as opportunistic pickup rather than urgent."
tags: ["stack:markdown", "area:adopter-migration", "concern:doc-cleanup"]
needs_contract: false
needs_ux: false
---
## Description

Clean up sales repo CLAUDE.md: remove the pre-existing UNMARKED duplicate 'Autonomous Loop — HARD RULES' section carrying dead /loop:slice and /loop:phase-gate references (predates the devcrew migration, traced to commit 89de31a 'agentic-setup rebuild'); keep the single devcrew marker block as the only loop-rules section; local commit in sales only.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the sales repo's CLAUDE.md containing both the unmarked legacy 'Autonomous Loop -- HARD RULES' section and the devcrew marker block, When the cleanup runs, Then the unmarked legacy section is removed in full.
- AC-2: Given the cleanup is applied, When CLAUDE.md is inspected afterward, Then exactly one loop-rules section remains (the devcrew marker block) and no dead /loop:slice or /loop:phase-gate references remain anywhere in the file.
- AC-3: Given no other content in the sales repo's CLAUDE.md is in scope, When the diff is reviewed, Then it touches only the removed section's lines -- no unrelated edits.
- AC-4: Given the change is complete, When it is committed, Then it is a single local commit scoped to the sales repo only.
