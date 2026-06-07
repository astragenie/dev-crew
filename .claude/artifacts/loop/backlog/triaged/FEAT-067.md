---
id: FEAT-067
status: triaged
priority: P2
category: refactor
target_release: null
created: 2026-06-07
updated: 2026-06-07
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.3
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.55
pm_technical_risk: 0.25
pm_dependency_depth: 0.2
composite_score: 0.35
autonomous_safe: true
triage_notes: "Self-triaged at file time. Refactor under existing test coverage; risk low; effort low."
---
# FEAT-067: Refactor runAutoMerge into 5 MergeContext helpers (complexity cap)

## Description

`src/scripts/lib/auto-merge.mts::runAutoMerge` is 208 lines with cyclomatic complexity 56 — over CLAUDE.md cap of 15. Shipped this way in v0.24.0 (SLICE-64) because builder ran out of budget mid-refactor. GRADE-SLICE-64 lessons + SLICE-64 review noted as follow-up. Refactor extracts the orchestrator into 5 already-named helpers per the contract artifact (FEAT-062-contracts.md): `fetchAndRebase`, `squashAndCommit`, `pushIfEnabled`, `cleanupWorktreeAndBranch`, `markFailureAndThrow`. `runAutoMerge` becomes a thin top-level orchestrator over the 5.

## Acceptance criteria

- AC-1: `runAutoMerge` cyclomatic complexity ≤ 15 (currently 56)
- AC-2: `runAutoMerge` body length ≤ 120 lines (currently 208)
- AC-3: 5 extracted helpers exist (`fetchAndRebase`, `squashAndCommit`, `pushIfEnabled`, `cleanupWorktreeAndBranch`, `markFailureAndThrow`) — each ≤ 15 complexity and named per contract artifact
- AC-4: `runAutoMergeStage` (in `complete-slice.mts`) complexity ≤ 15 (currently 24) — extract helpers
- AC-5: `completeSlice` complexity ≤ 15 (currently 16) — single helper extraction
- AC-6: Existing 32+ auto-merge tests all pass unchanged — refactor is internal, public surface unchanged (`runAutoMerge`, `MergeResult`, `MergeError`, `DryRunPlan` interfaces stable)
- AC-7: ESLint reports 0 complexity warnings across all 3 functions
- AC-8: `npm test`, `npm run lint`, `npm run typecheck` clean

## Acceptance hints

- This is a pure internal refactor — no behavior change, no contract change.
- All 32+ existing tests must continue to pass. If a test starts failing, the refactor broke an invariant — STOP and surface it.
- The contract artifact at `.claude/artifacts/crew/designs/FEAT-062-contracts.md` already specifies the helper names. Use those exact names.
- Builder may need to also adjust validate-content-length cap if extracted helpers push the module over 400 lines split-threshold.

## Out of scope

- Public API changes (`runAutoMerge` signature, MergeResult shape, etc.) — internal-only refactor
- New tests for the extracted helpers — if added, must be additive (existing tests still pass)
- Other complexity warnings outside auto-merge.mts + complete-slice.mts

## Tracking

- Filed: 2026-06-07 (after SLICE-64 v0.24.0 ship)
- Origin: GRADE-SLICE-64 followups + SLICE-64 review notes
