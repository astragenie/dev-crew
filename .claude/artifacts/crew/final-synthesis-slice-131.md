---
slice_id: SLICE-131
feat_id: FEAT-197
status: synthesis_complete
---

# Final Synthesis: SLICE-131 — Dispatch Absolute Marker Path + Worktree Fallback Scan

**Slice**: SLICE-131 (Dispatch result.json path is relative — child worktree CWD breaks finalize finder)  
**Feature**: FEAT-197  
**Target Release**: v0.50.0  
**Date**: 2026-06-13

## Objective

Fix a bug where child agents in git worktrees write `dispatch/result.json` files to their own worktree CWD instead of the main repo. The `dispatch finalize` step only scans the main repo and marks all FEATs as `no marker` even though the results were successfully written.

## What Was Built

### Code Changes (commit f7c18ff + 2996cff + 5319572)

1. **Absolute path in prompt** (`dispatch-prompt.mts`):
   - Changed result-path template from relative to absolute: `path.join(repoRoot, ".claude/artifacts/loop/dispatch", ...)`
   - `repoRoot` is passed via new `AugmentArgs.repoRoot` field (required parameter)
   - Tests: AC-2 covers POSIX (`/path`) and Windows (`C:\path`) formats

2. **Worktree fallback scan** (`dispatch-aggregate.mts`):
   - `aggregateResults()` now scans main repo first (existing behavior)
   - If result not found in main, scans each known child worktree root (`cwdById[plan.id]`)
   - Copies any found `result.json` to main before marking DONE/no-marker
   - Tests: AC-3 includes fixture with mock `cwdById` state

3. **Main-wins tie-break** (`dispatch-aggregate.mts`):
   - AC-4: if child wrote to both main (correct) and worktree (stale), main wins
   - Implemented via existence check: `exists(mainPath)` short-circuits before fallback

4. **Type signature update** (all dispatch callers):
   - `AugmentArgs` now requires `repoRoot: string` (absolute path to main repo)
   - Updated all call sites: `dispatch-batch.mts`, `dispatch-prompt.mts`, `hierarchical-dispatch.mts`, `dispatch.mts` (including dry-run at line 102)
   - Back-compat: single-worktree dispatch unchanged (AC-5)

### Test Coverage

5 new tests in `src/tests/dispatch-result-path.test.mts`:
- AC-2: Absolute path format (POSIX + Windows)
- AC-3: Worktree fallback scan with cross-worktree copy
- AC-4: Main-wins tie-break
- AC-5: Single-worktree back-compat

6 existing tests updated for new `repoRoot` signature.  
All 11 tests pass. Full suite: 1541/1591 pass (pre-existing failure unrelated).

### Documentation

- CHANGELOG entry for v0.50.0
- FEAT-197 frontmatter: `status: done`, `target_release: 0.50.0`, `slices_complete: [SLICE-131]`
- SLICE-131 frontmatter: `status: done`, `target_release: 0.50.0`

## Decisions & Tradeoffs

**Decision**: Implement both absolute path (AC-2) and worktree fallback (AC-3) rather than just one.
- **Rationale**: Correctness (absolute path) + resilience (fallback) = defense in depth.
- **Cost**: Small (~10 lines added to `dispatch-aggregate.mts` for fallback scan).
- **Benefit**: Even if a child agent ignores the absolute path instruction, finalize will still find the result.

**Decision**: `repoRoot` is passed at dispatch-prompt-build time, not at finalize time.
- **Rationale**: Prompt template needs it to emit the correct path.
- **Constraint**: Caller (`dispatch.mts`) must know the main repo path at time of prompt build (satisfied: `dispatch.mts` has `repo` param from CLI).

## Review & Validation Journey

1. **Initial submission** (commit f7c18ff): Full implementation of AC-2/AC-3/AC-4/AC-5.
2. **Reviewer A rejection** (2026-06-13T16:48:23Z): TypeScript compile error at `dispatch.mts:102` — dry-run call missing `repoRoot`.
3. **Reviewer B** (2026-06-13T16:45:09Z): Identical issue flagged; requested exhaustive call-site grep.
4. **Builder fix** (commit 2996cff): Added `repoRoot: repo` to dry-run `augmentPrompt` call.
5. **Builder style** (commit 5319572): Prettier format pass.
6. **Re-validation** (2026-06-13T17:03:18Z): All gates green (tsc, ESLint, tests, Prettier).

## Confidence & Lessons

**Overall Confidence**: 0.88 (excellent implementation, minor signature-coordination hiccup).

**Key Lesson**: Signature changes require exhaustive call-site grep. When a function gains a required parameter, manually inspect ALL call sites (including branches, test fixtures, and feature flags) before declaring done. The dry-run branch was caught by the review ladder, but the lesson generalizes: grep is a required manual step, not just a code-review artifact.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Prompt template now emits absolute path — soft contract edge with child agents | AC-4 + AC-5 fences both sides: main wins (AC-4), single-worktree unaffected (AC-5) |
| Path format depends on `repoRoot` being the true main repo root | Code inspection confirms scope: `repo` at line 94 in `dispatch.mts` is already bound to main repo |
| Observability: no new logging added | Aligned with plugin-dev baseline (0.818); no telemetry stack for runtime instrumentation |
| Pre-mortem: worktree-path source (`cwdById`) might not be wired | Code inspection confirms: slice assumes, review verified assumption holds |

## Recommended Action

Merge to main and release as v0.50.0.

---

**Synthesis created**: 2026-06-13  
**Created by**: loop:document-writer (automated SLICE-131 closure)  
**Next step**: Trigger release script for v0.50.0
