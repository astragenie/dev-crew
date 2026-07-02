---
id: FEAT-209
status: triaged
priority: P1
category: reliability
target_release: null
created: 2026-07-02
updated: 2026-07-02
depends_on: []
slices: []
derived_from: docs/research/2026-07-02-architecture-retrospective.md
tags: [reliability, crew, contract]
needs_contract: true
needs_ux: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.42
pm_strategic_alignment: 0.7
pm_technical_risk: 0.65
pm_dependency_depth: 0.35
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-07-02
autonomous_safe: false
triage_notes: "via=pm (2026-07-02 retrospective intake). Technical risk band 0.6-0.8: schema/data-shape change (new schemaVersion field) on a file that is a documented cross-plugin write contract (DEC-018/019) shared with another plugin's runtime -- rollback needs coordination across two repos, not a bare revert. P1 with review (autonomousSafe: false) matching the retrospective stub's own annotation: real prior incident, but full ADR-D completion depends on an out-of-repo upstream change I cannot verify or gate here."
---
# FEAT-209: workflow-state runtime validation + schemaVersion guard

## Problem

Crew's `WorkflowStateSchema` (Zod, `dev-team/scripts/lib/schemas.ts:69-76`)
is never invoked at load: `loadWorkflowState` does raw
`JSON.parse(...) as WorkflowState` ("shape is trusted"). Loop writes
session pins into crew's state file (DEC-018/019, deliberate) with a
documented divergence risk. The 2026-06-10 session-hang rebuild's only
record is the reconcileNote inside the state file itself.

## Acceptance hints

- Loop-side: refuse cross-plugin state write when `schemaVersion`
  mismatches; additive field, old files implicitly v1.
- Crew-side (file upstream-request): validate with the existing schema
  at load; malformed file yields a named error + repair hint, not a
  JSON.parse throw.
- Implements retrospective ADR-D.

## Evidence

- Retrospective top-10 #7, F-04 (WP1), WP7;
  `dev-team/scripts/lib/workflow-state.ts:117-137`;
  DEC-018:26-27, DEC-019.

## Acceptance criteria (Given-When-Then)

- AC-1: Given a crew workflow-state.json file with no schemaVersion field (the current shape -- dev-team/scripts/lib/schemas.ts:69-76's WorkflowStateSchema has no schemaVersion key today), When loop's session-pin writer reads it, Then it treats the file as implicitly schemaVersion: 1 and proceeds without refusal.
- AC-2: Given a workflow-state.json file whose schemaVersion is greater than the version loop's writer supports, When loop attempts to write a session pin into it, Then the write is refused with a named error identifying the version mismatch, not a silent overwrite.
- AC-3: Given a malformed or partially-written workflow-state.json reproducing the class of corruption behind the 2026-06-10 session-hang rebuild, When loop's write path is invoked, Then it fails loud with a repair hint instead of the current JSON.parse(...) as WorkflowState pattern (workflow-state.ts:122-124) silently producing an invalid in-memory object.
- AC-4: Given this FEAT's loop-side guard ships, When a reviewer checks scope, Then the FEAT body/PR explicitly notes the crew-side counterpart (validating WorkflowStateSchema at loadWorkflowState, workflow-state.ts:117-137) is filed as a separate upstream-request against dev-team, not silently assumed done.
