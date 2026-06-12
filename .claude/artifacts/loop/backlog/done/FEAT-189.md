---
id: FEAT-189
status: done
slices_complete: [SLICE-103]
completed_at: 2026-06-12
priority: P1
category: workflow
target_release: null
created: 2026-06-12
updated: 2026-06-12
depends_on: []
slices: [SLICE-103]
derived_from: null
autonomous_safe: true
tags: [workflow, command]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.6
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.65
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
composite_score: 0.65
composite_priority: P1
github_issue: 221
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/221"
started_at: 2026-06-12
---
# FEAT-189: Merge triage and backlog-enrich into single intake command

## Problem

Backlog intake currently requires two slash invocations: `/loop:triage` then `/loop:backlog-enrich`. Both run back-to-back in practice. The split gates routing on whether the operator remembered to run enrich. Several FEATs (FEAT-167 among them) ended up triaged-but-not-enriched.

## Proposal

New `/loop:intake` slash command runs both phases in order. Existing commands stay for back-compat.

## Acceptance criteria

**AC-1:** `commands/intake.md` exists with frontmatter `description:` documenting the two-phase orchestration.

**AC-2:** Command spells out PM-must-finish-before-architect rule + PM-halt-skips-architect.

**AC-3:** Decline filter: skip architect for `composite_priority: "P4"` FEATs. Report `declined: <count>`.

**AC-4:** Back-compat: existing `commands/triage.md` and `commands/backlog-enrich.md` unchanged.

**AC-5:** Test verifies the file exists with correct frontmatter and references both phases.

## Out of scope

- Refactoring triage skill to embed architect phase.
- CLI exposure (no CLI today; slash flow only).
- Renaming/deprecating the standalone commands.

## Refs

- `commands/triage.md`
- `commands/backlog-enrich.md`
- `agents/pm.md`
- `agents/architect.md`
