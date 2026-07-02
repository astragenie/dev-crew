---
id: FEAT-202
status: done
priority: P2
category: bugfix
closed: 2026-07-01
close_note: "SLICE-134 (inventory) + SLICE-135 (partial cherry-pick + worker-failed artifact) shipped. Destructive teardown (rmdir extension + operator prompt + Windows handle-leak) deferred — file new FEAT if orphan-worktree pain recurs after these two ship."
target_release: null
created: 2026-06-20
updated: 2026-07-01
triaged_at: 2026-06-20
depends_on: []
slices: [SLICE-134, SLICE-135]
derived_from: hero-crew-FEAT-164
upstream_request: "hero-crew FEAT-164 (PM-triaged 2026-06-20 P2 composite 0.61, autonomous_safe=false, split into SLICE-A inventory + SLICE-B destructive)"
autonomous_safe: false
tags: [crew-parallel, worktree, cleanup, dx, windows, dispatch-finalize]
pm_customer_impact: 0.8
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.75
pm_technical_risk: 0.7
pm_dependency_depth: 0.3
composite_score: 0.61
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Dry-run inventory phase — list orphan worktrees + branch deltas, no destructive ops"
    points: 2
  - id_suffix: -SLICE-2
    title: "Destructive teardown — cherry-pick handoffs, remove worktrees, prune branches"
    points: 3
triage_notes: |
started_at: 2026-07-01
slices_complete: [SLICE-135]
---
# FEAT-202: `dispatch finalize` orphans worktrees + loses on-branch work (ported from hero-crew FEAT-164)

## Description

This FEAT is the loop-repo half of hero-crew FEAT-164. The hero-crew side was closed with a cross-repo redirect note pointing here; the actual code that needs to change lives in `src/scripts/lib/dispatch-{merge,worktree}.mts`.

## Observed failure (loopobserver, 2026-06-13 → 2026-06-14)

After ~22 parallel waves over 24h, the host repo accumulated:

- 22 worktree directories under `.claude/worktrees/` (~5GB on disk; each carries a full `node_modules/` + `bin/` + `obj/`)
- 22 stale branches (all squash-merged into main, leaving each branch's last commit a docs-only handoff that never made it onto main)
- 5 orphan handoff artifacts (`SLICE-NNN-handoff.md`) that exist only on the worktree branches — recovery required manual cherry-pick
- 1 useful test-infra fix (`IApiMarker.cs` + `IntegrationFixture<IApiMarker>` swap on `wave-1/feat-163b-tenancy`) that resolved a real `WebApplicationFactory<Program>` ambiguity bug — also never reached main. Recovery required manual diff + copy + commit.

Manual cleanup cost: 1 session (~30 min, ~$1.50) to audit, diff, cherry-pick, and prune. 4 worktree dirs **still stuck** because VS Code TS / Tailwind language servers hold `node_modules/@tailwindcss/oxide-win32-x64-msvc/tailwindcss-oxide.win32-x64-msvc.node` mmap'd.

## Root cause (verified code inspection — see triage_notes for line refs)

1. **`mergeChildren` only tears down DONE+merged workers.** Filter at `dispatch-merge.mts:14` strips FAIL/BLOCKED. Removed only after a successful merge (`removeChildWorktree` at line 26). CONFLICTED branch on merge gets preserved (correct) but with no audit hint.
2. **No inventory before remove.** `removeChildWorktree` at `dispatch-worktree.mts:67` is destructive-only. Files on the worker branch that won't survive squash-merge are silently lost.
3. **Failures swallowed.** Empty catch blocks on `git worktree remove` + `git branch -D`. On Windows handle-leak the rmdir fails silently and operator sees a phantom-clean state with orphans on disk.
4. **No teardown for `crew:parallel` failed waves.** When the wave aggregator (`crew:parallel` in hero-crew) finishes with mixed PASS/FAIL children, the FAIL worktrees orphan permanently.

## Acceptance criteria

Sketch — needs formal spec-writer pass before SLICE-B starts.

### SLICE-A (autonomous_safe, this slice)

- **AC-1**: New `inventoryWorkerBranch(repoRoot, worktreePath, branch, parentBranch)` in `src/scripts/lib/dispatch-worktree.mts`. Returns `{ filesOnBranchNotOnMain: string[], uncommittedWip: Array<{ path: string; status: string }> }`. Pure read-only — no git mutations.
  - `filesOnBranchNotOnMain`: from `git diff parentBranch...branch --name-only`, filtered to exist on branch tip.
  - `uncommittedWip`: from `git -C worktreePath status --porcelain`.
- **AC-2**: Wire into `mergeChildren` in `dispatch-merge.mts`. BEFORE `removeChildWorktree`, call `inventoryWorkerBranch` for every child (DONE / CONFLICTED / FAIL — not just DONE). Append findings to JSONL log at `.claude/artifacts/loop/dispatch/<runId>/inventory.jsonl`.
- **AC-3**: For CONFLICTED + FAIL children that previously had no audit trail, emit a `worker-preserved.md` artifact at `.claude/artifacts/loop/dispatch/<runId>/worker-preserved-<childId>.md` summarizing: branch name, worktree path, status, files-on-branch-not-on-main (counts + first 10 paths), uncommitted WIP (counts + first 10 paths), suggested next action.
- **AC-4**: 3+ tests covering `inventoryWorkerBranch`: clean branch (zero deltas), branch-with-handoff (single .md on branch not on main), branch-with-WIP (untracked files in worktree).
- **AC-5**: NO destructive operations introduced this slice. `mergeChildren` continues to call `removeChildWorktree` ONLY on DONE+merged path (same behavior as today). Inventory is read-only telemetry — operator decides destructive action next.
- **AC-6**: `bun run typecheck` clean. New tests PASS. `bun run lint src/scripts/lib/dispatch-worktree.mts src/scripts/lib/dispatch-merge.mts` zero new warnings.

### SLICE-B (autonomous_safe=false, gated)

Deferred. Body of FEAT spec carries the original 5 ACs (auto-cherry-pick handoffs onto main, extend remove to CONFLICTED/FAIL with operator prompt, default-keep on rmdir failure, Windows handle-leak hint, worker-failed artifact). SLICE-A unblocks visibility; SLICE-B unblocks remediation.

## Out of scope

- Windows handle-leak root cause (VS Code / Tailwind upstream issue).
- Worktree pre-creation hygiene (this FEAT is post-merge).
- Cross-runId aggregation (each runId scope is self-contained).
