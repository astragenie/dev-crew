---
id: SLICE-134
title: "Dry-run inventory phase — list orphan worktrees + branch deltas, no destructive ops"
status: completed
feature: FEAT-202
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-07-01
updated: 2026-07-01
effort_points: 2
touches_files: [src/scripts/lib/dispatch-worktree.mts, src/scripts/lib/dispatch-merge.mts, src/tests/dispatch-worktree-inventory.test.mts]
completed_at: 2026-07-01
---
# SLICE-134: Dry-run inventory phase — list orphan worktrees + branch deltas, no destructive ops

Implements FEAT-202 SLICE-A. See [feature file](../../../backlog/in-progress/FEAT-202.md).

## Objective

Add read-only inventory of orphan worktrees + on-branch files that would be lost by `removeChildWorktree`. Emit JSONL inventory log + per-child `worker-preserved-<childId>.md` audit artifact for CONFLICTED/FAIL children. NO destructive git ops introduced this slice.

## In scope

- New `inventoryWorkerBranch(repoRoot, worktreePath, branch, parentBranch)` in `src/scripts/lib/dispatch-worktree.mts`. Returns `{ filesOnBranchNotOnMain: string[], uncommittedWip: Array<{ path: string; status: string }> }`. Pure read-only, no git mutations.
- Wire into `mergeChildren` in `src/scripts/lib/dispatch-merge.mts`. BEFORE `removeChildWorktree`, call `inventoryWorkerBranch` for every child (DONE / CONFLICTED / FAIL). Append findings to JSONL at `.claude/artifacts/loop/dispatch/<runId>/inventory.jsonl`.
- For CONFLICTED + FAIL children with no prior audit trail, emit `worker-preserved-<childId>.md` at `.claude/artifacts/loop/dispatch/<runId>/worker-preserved-<childId>.md` summarizing branch, worktree path, status, files-on-branch-not-on-main (counts + first 10 paths), uncommitted WIP (counts + first 10 paths), suggested next action.
- 3+ tests in `src/tests/dispatch-worktree-inventory.test.mts` covering: clean branch (zero deltas), branch-with-handoff (single `.md` on branch not on main), branch-with-WIP (untracked files in worktree).

## Out of scope

- Destructive teardown changes (SLICE-135 / FEAT-202 SLICE-B).
- Auto-cherry-pick of on-branch commits onto main.
- Windows handle-leak root cause.
- Extending `removeChildWorktree` to CONFLICTED/FAIL children (SLICE-135).
- Cross-runId aggregation.

## Acceptance criteria

- [ ] AC-1: `inventoryWorkerBranch(repoRoot, worktreePath, branch, parentBranch)` exported from `src/scripts/lib/dispatch-worktree.mts`, returns `{ filesOnBranchNotOnMain: string[]; uncommittedWip: Array<{ path: string; status: string }> }`. `filesOnBranchNotOnMain` sourced from `git diff parentBranch...branch --name-only`, filtered to paths existing on branch tip. `uncommittedWip` sourced from `git -C worktreePath status --porcelain`. Pure read-only — no `git commit`, `git reset`, `git branch`, `git worktree remove`, or file writes to the worktree.
- [ ] AC-2: `mergeChildren` in `src/scripts/lib/dispatch-merge.mts` invokes `inventoryWorkerBranch` for every child (DONE, CONFLICTED, FAIL — not filtered) BEFORE any `removeChildWorktree` call. Findings appended one line per child to `.claude/artifacts/loop/dispatch/<runId>/inventory.jsonl` in shape `{ childId, branch, worktreePath, status, filesOnBranchNotOnMain, uncommittedWip, timestamp }`.
- [ ] AC-3: For CONFLICTED and FAIL children, emit `.claude/artifacts/loop/dispatch/<runId>/worker-preserved-<childId>.md` with sections: branch name, worktree path, status, `filesOnBranchNotOnMain` count + first 10 paths, `uncommittedWip` count + first 10 paths, one-line suggested next action (e.g. "cherry-pick handoff onto main before pruning").
- [ ] AC-4: Tests in `src/tests/dispatch-worktree-inventory.test.mts` cover ≥ 3 cases: (a) clean branch — both arrays empty; (b) branch with `.claude/artifacts/crew/handoffs/handoff.md` on branch not on main — `filesOnBranchNotOnMain` contains that path; (c) branch with untracked file in worktree — `uncommittedWip` contains `{ path, status: "??" }`. Tests spin up a temp git repo, no dependency on host state.
- [ ] AC-5: NO destructive operations introduced this slice. `mergeChildren` continues to call `removeChildWorktree` ONLY on the DONE+merged path (unchanged behavior). Grep for `git.*worktree.*remove`, `git.*branch.*-D`, `rmdir`, `rm -r` in this slice's diff MUST return only pre-existing call sites (no new).
- [ ] AC-6: `bunx tsc --project tsconfig.json --noEmit` clean. `bunx tsc --project tsconfig.test.json --noEmit` clean. `bun test src/tests/dispatch-worktree-inventory.test.mts --timeout 60000` PASS. `bunx eslint src/scripts/lib/dispatch-worktree.mts src/scripts/lib/dispatch-merge.mts src/tests/dispatch-worktree-inventory.test.mts` zero new warnings.
- [ ] AC-7: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and linter is clean (`bunx eslint src eslint.config.mjs`).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-202 moved from `in-progress/` to `done/` NO — remains `in-progress/` (SLICE-135 still pending). Do NOT auto-move.
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: correctness — inventory diff semantics (does `parentBranch...branch --name-only` produce the intended set including committed-but-unmerged files), test coverage completeness, edge cases (empty branch, symlinks, submodules).
- Reviewer B: production-readiness — JSONL append atomicity, worker-preserved MD path collision on duplicate childId, no destructive-op regressions, observability (structured logging on inventory-write failure).
