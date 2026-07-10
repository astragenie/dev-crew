---
id: SLICE-151
title: Feature-side delegate conversion across 11 backlog-writer callers
status: completed
feature: FEAT-250
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-07-10
updated: 2026-07-10
effort_points: 5
github_issue: 420
github_url: "https://github.com/astragenie/runner-plugin/issues/420"
touches_files: [src/scripts/lib/backlog-store.mts, src/scripts/lib/backlog-writer.mts, src/tests/backlog-store-parity.test.mts]
completed_at: 2026-07-10
---
# SLICE-151: Feature-side delegate conversion across 11 backlog-writer callers

Implements FEAT-250. See [feature file](../../../backlog/in-progress/FEAT-250.md) for product context.

## Objective

Tracker-provider program Phase 1 — BacklogStore storage seam. Architect designs BacklogStore interface (createFeature, updateFeatureFrontmatter, moveFeature, createSlice, updateSliceFrontmatter, moveSlice, listByState, getById) with DEC before code. Feature side (mechanical): backlog-writer.mts functions become thin delegates — 11 caller files (re-grep before sizing). Slice side is NEW CONSTRUCTION per review COND-A, budget separately: no canonical slice-writer exists; consolidate scattered raw fs writes in slice-linker/complete-slice.mts (moveAndStampSlice), feature-lifecycle.mts (materializeSingleSlice/materializeProposedSlices); wave/failure-pivot.mts mutates frontmatter via hand-rolled regex (not shared frontmatter.mjs) — DEC must decide port-to-mergeFrontmatter (behavior-verified) vs documented exception. Preserve DORA A2 envelope behavior + integration tests (FEAT-247) — HARD DEPENDENCY: do not start until FEAT-247 is done; its moveFeature integration test stays green untouched. CI guard per COND-D: explicit allowlist gate (validate-imports.mts BOUNDARIES style), NOT bare no-fs rule; classify doctor.mts up front (store vs named exception — its reconciliation is content-level surgery); allowlist test fixture writers; register gate in CLAUDE.md CI list. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5). depends_on: FEAT-247.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given the current moveFeature/updateFeatureFrontmatter callers across the 11 files identified via grep (src/scripts/loop.mts, slice-linker/start-slice.mts, slice-linker/feature-lifecycle.mts, pm-apply.mts, arch-gate.mts, slice-linker/close-slice.mts, grade-writer.mts, slice-linker/complete-slice.mts, intake.mts, spec-decomposer.mts, claims-sync.mts), When the BacklogStore interface (createFeature, updateFeatureFrontmatter, moveFeature, listByState, getById) lands and backlog-writer.mts functions become thin delegates, Then every caller's frontmatter output is byte-identical to pre-refactor output for the same input -- evidenced by a before/after parity test run across all 11 callers.
- [ ] AC-2: Given the DORA A2 integration test added by FEAT-247 (asserting moveFeature forwards priority/category/relates_to/createdAt into emitBacklogStateChanged), When moveFeature is re-homed onto BacklogStore, Then that integration test still passes unmodified -- evidenced by CI showing the FEAT-247 test green after the Phase 1 refactor with zero edits to the test file itself.
- [ ] AC-3: Given no canonical slice-writer exists today (raw fs writes scattered across slice-linker/complete-slice.mts's moveAndStampSlice and slice-linker/feature-lifecycle.mts's materializeSingleSlice/materializeProposedSlices), When createSlice/updateSliceFrontmatter/moveSlice are introduced on BacklogStore, Then all three call sites are migrated to call the new methods and no raw fs.writeFileSync/fs.renameSync against slice files remains outside the BacklogStore module -- evidenced by the CI allowlist gate (AC-5) finding zero disallowed writers.
- [ ] AC-4 (edge/error path): Given wave/failure-pivot.mts currently mutates slice frontmatter via hand-rolled regex rather than the shared frontmatter.mjs/mergeFrontmatter parser, When the Phase 1 architect DEC decides port-vs-exception, Then either (a) failure-pivot.mts is ported to mergeFrontmatter and a regression test proves identical output on a malformed/edge-case frontmatter block it previously handled via regex, or (b) the DEC documents it as a named allowlist exception with a one-line rationale in the CI guard config -- evidenced by the DEC file and, for path (a), the regression test; for path (b), a CI guard test asserting failure-pivot.mts is present in the exception list.
- [ ] AC-5: Given the CI guard must be an explicit allowlist (not a bare 'no fs on backlog paths' rule) per COND-D, When any file outside the BacklogStore module or the allowlist writes to .claude/artifacts/loop/backlog/**, Then the validate-imports.mts-style CI check fails the build; When doctor.mts performs its content-level reconciliation writes, Then it passes because it is either migrated onto BacklogStore or explicitly allowlisted per the up-front DEC classification -- evidenced by a new CI script test with a violating fixture (fails) and doctor.mts/test-fixture writers (pass).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-250 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
