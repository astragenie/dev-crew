---
id: FEAT-250
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-10
depends_on: [FEAT-247]
slices: [SLICE-150, SLICE-151, SLICE-152, SLICE-153]
derived_from: null
pm_customer_impact: 0.5
pm_effort_estimate: 0.8
pm_strategic_alignment: 0.75
pm_technical_risk: 0.65
pm_dependency_depth: 0.45
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "Cross-module reach (11+ callers, 3+ scattered write sites to consolidate, new CI allowlist gate) with no new external dependency and no persisted-data-shape change lands technical_risk at 0.65 (bottom of the 0.6-0.8 band), triggering the mandatory pre-mortem; foundational to every downstream phase (2-6) -> P1; effort_estimate 0.8 maps to 13 Fibonacci points, tripping the FEAT-168 decomposition gate -- decomposed into 4 slices below summing to 16 points."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Architect DEC: BacklogStore interface + doctor.mts classification + failure-pivot regex decision"
    points: 3
  - id_suffix: -SLICE-2
    title: Feature-side delegate conversion across 11 backlog-writer callers
    points: 5
  - id_suffix: -SLICE-3
    title: "Slice-side new construction: consolidate complete-slice/feature-lifecycle/failure-pivot writes"
    points: 5
  - id_suffix: -SLICE-4
    title: CI allowlist guard + CLAUDE.md CI-list registration + DORA A2 parity test
    points: 3
tags: [storage, refactor, infra]
needs_contract: true
needs_ux: false
started_at: 2026-07-10
github_issue: 423
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/423"
slices_complete: [SLICE-151]
---
## Description

Tracker-provider program Phase 1 — BacklogStore storage seam. Architect designs BacklogStore interface (createFeature, updateFeatureFrontmatter, moveFeature, createSlice, updateSliceFrontmatter, moveSlice, listByState, getById) with DEC before code. Feature side (mechanical): backlog-writer.mts functions become thin delegates — 11 caller files (re-grep before sizing). Slice side is NEW CONSTRUCTION per review COND-A, budget separately: no canonical slice-writer exists; consolidate scattered raw fs writes in slice-linker/complete-slice.mts (moveAndStampSlice), feature-lifecycle.mts (materializeSingleSlice/materializeProposedSlices); wave/failure-pivot.mts mutates frontmatter via hand-rolled regex (not shared frontmatter.mjs) — DEC must decide port-to-mergeFrontmatter (behavior-verified) vs documented exception. Preserve DORA A2 envelope behavior + integration tests (FEAT-247) — HARD DEPENDENCY: do not start until FEAT-247 is done; its moveFeature integration test stays green untouched. CI guard per COND-D: explicit allowlist gate (validate-imports.mts BOUNDARIES style), NOT bare no-fs rule; classify doctor.mts up front (store vs named exception — its reconciliation is content-level surgery); allowlist test fixture writers; register gate in CLAUDE.md CI list. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5). depends_on: FEAT-247.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the current moveFeature/updateFeatureFrontmatter callers across the 11 files identified via grep (src/scripts/loop.mts, slice-linker/start-slice.mts, slice-linker/feature-lifecycle.mts, pm-apply.mts, arch-gate.mts, slice-linker/close-slice.mts, grade-writer.mts, slice-linker/complete-slice.mts, intake.mts, spec-decomposer.mts, claims-sync.mts), When the BacklogStore interface (createFeature, updateFeatureFrontmatter, moveFeature, listByState, getById) lands and backlog-writer.mts functions become thin delegates, Then every caller's frontmatter output is byte-identical to pre-refactor output for the same input -- evidenced by a before/after parity test run across all 11 callers.
- AC-2: Given the DORA A2 integration test added by FEAT-247 (asserting moveFeature forwards priority/category/relates_to/createdAt into emitBacklogStateChanged), When moveFeature is re-homed onto BacklogStore, Then that integration test still passes unmodified -- evidenced by CI showing the FEAT-247 test green after the Phase 1 refactor with zero edits to the test file itself.
- AC-3: Given no canonical slice-writer exists today (raw fs writes scattered across slice-linker/complete-slice.mts's moveAndStampSlice and slice-linker/feature-lifecycle.mts's materializeSingleSlice/materializeProposedSlices), When createSlice/updateSliceFrontmatter/moveSlice are introduced on BacklogStore, Then all three call sites are migrated to call the new methods and no raw fs.writeFileSync/fs.renameSync against slice files remains outside the BacklogStore module -- evidenced by the CI allowlist gate (AC-5) finding zero disallowed writers.
- AC-4 (edge/error path): Given wave/failure-pivot.mts currently mutates slice frontmatter via hand-rolled regex rather than the shared frontmatter.mjs/mergeFrontmatter parser, When the Phase 1 architect DEC decides port-vs-exception, Then either (a) failure-pivot.mts is ported to mergeFrontmatter and a regression test proves identical output on a malformed/edge-case frontmatter block it previously handled via regex, or (b) the DEC documents it as a named allowlist exception with a one-line rationale in the CI guard config -- evidenced by the DEC file and, for path (a), the regression test; for path (b), a CI guard test asserting failure-pivot.mts is present in the exception list.
- AC-5: Given the CI guard must be an explicit allowlist (not a bare 'no fs on backlog paths' rule) per COND-D, When any file outside the BacklogStore module or the allowlist writes to .claude/artifacts/loop/backlog/**, Then the validate-imports.mts-style CI check fails the build; When doctor.mts performs its content-level reconciliation writes, Then it passes because it is either migrated onto BacklogStore or explicitly allowlisted per the up-front DEC classification -- evidenced by a new CI script test with a violating fixture (fails) and doctor.mts/test-fixture writers (pass).

## Proposed slices (PM decomposition)

- SLICE-1: Architect DEC: BacklogStore interface + doctor.mts classification + failure-pivot regex decision (3 pts)
- SLICE-2: Feature-side delegate conversion across 11 backlog-writer callers (5 pts)
- SLICE-3: Slice-side new construction: consolidate complete-slice/feature-lifecycle/failure-pivot writes (5 pts)
- SLICE-4: CI allowlist guard + CLAUDE.md CI-list registration + DORA A2 parity test (3 pts)
