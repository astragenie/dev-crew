---
id: SLICE-66
status: completed
feature: FEAT-067
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
completed_at: 2026-06-07
github_issue: 141
github_url: "https://github.com/sergeymilashico/loop/issues/141"
---
# SLICE-66: Refactor runAutoMerge into 5 MergeContext helpers (complexity cap)

Implements FEAT-067. See [feature file](../../../backlog/in-progress/FEAT-067.md) for product context.

## Objective

`src/scripts/lib/auto-merge.mts::runAutoMerge` is 208 lines with cyclomatic complexity 56 — over CLAUDE.md cap of 15. Shipped this way in v0.24.0 (SLICE-64) because builder ran out of budget mid-refactor. GRADE-SLICE-64 lessons + SLICE-64 review noted as follow-up. Refactor extracts the orchestrator into 5 already-named helpers per the contract artifact (FEAT-062-contracts.md): `fetchAndRebase`, `squashAndCommit`, `pushIfEnabled`, `cleanupWorktreeAndBranch`, `markFailureAndThrow`. `runAutoMerge` becomes a thin top-level orchestrator over the 5.

## In scope

- Extract 5 helpers from `runAutoMerge`: `fetchAndRebase`, `squashAndCommit`, `pushIfEnabled`, `cleanupWorktreeAndBranch`, `markFailureAndThrow`
- `runAutoMerge` body shrinks to thin orchestrator over the 5 helpers (≤ 120 lines, complexity ≤ 15)
- Same pattern applied to `runAutoMergeStage` in `complete-slice.mts` (extract complexity into helpers, drop to ≤ 15)
- Single helper extraction in `completeSlice` to drop complexity from 16 → ≤ 15
- All 32+ existing auto-merge tests pass unchanged
- All public API stays stable: `runAutoMerge`, `MergeResult`, `MergeError`, `DryRunPlan` interfaces unchanged

## Out of scope

- Public API changes (signature, return shape, error code list)
- New tests for the helpers — additive only if scope permits, must not block
- Other complexity warnings outside auto-merge.mts + complete-slice.mts
- Behavior changes (dry-run output, halt-badge content, git semantics)
- File reorganization (split auto-merge.mts into multiple files) — keep single-file orchestrator

## Acceptance criteria

- [ ] AC-1: `runAutoMerge` complexity ≤ 15 (currently 56) — verified by `npm run lint` reporting 0 complexity warnings on this function
- [ ] AC-2: `runAutoMerge` body length ≤ 120 lines (currently 208)
- [ ] AC-3: All 5 named helpers exist with these exact identifiers: `fetchAndRebase`, `squashAndCommit`, `pushIfEnabled`, `cleanupWorktreeAndBranch`, `markFailureAndThrow`. Each ≤ 15 complexity.
- [ ] AC-4: `runAutoMergeStage` (complete-slice.mts) complexity ≤ 15 (currently 24)
- [ ] AC-5: `completeSlice` complexity ≤ 15 (currently 16)
- [ ] AC-6: All 32+ existing auto-merge tests pass — `git diff tests/auto-merge.test.mjs` shows no behavior assertion changes (refactor-only)
- [ ] AC-7: `npm run lint` reports 0 errors AND 0 complexity warnings
- [ ] AC-8: `npm test`, `npm run typecheck`, `npm run format:check`, `node scripts/validate-manifests.mjs`, `node scripts/validate-content-length.mjs` all green

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-067 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A (refactor-correctness): verify NO behavior change — every git mutation sequence, error code, badge write, dry-run output, and cleanup-order invariant identical to v0.24.0; verify public API unchanged (interfaces, exports, signatures); read every helper for hidden control-flow change.
- Reviewer B (complexity check): confirm ESLint reports 0 complexity warnings on the 3 named functions; confirm helper names match contract artifact exactly; confirm no helper exceeds complexity 15 itself; check that `runAutoMerge` body is genuinely an orchestrator (no embedded fetch/rebase/merge logic — those moved into helpers).
