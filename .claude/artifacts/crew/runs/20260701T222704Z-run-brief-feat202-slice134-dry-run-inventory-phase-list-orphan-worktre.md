---
feature: FEAT-202
status: active
---
# Run Brief: FEAT202 SLICE134: Dry-run inventory phase — list orphan worktrees + branch deltas, no destructive ops

- Created: 2026-07-01T22:27:04.092Z
- Tier: full
- Goal: Add read-only inventory of orphan worktrees + on-branch files that would be lost by `removeChildWorktree`. Emit JSONL inventory log + per-child `worker-preserved-<childId>.md` audit artifact for CONFLICTED/FAIL children. NO destructive git ops introduced this slice.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New `inventoryWorkerBranch(repoRoot
  - worktreePath
  - branch
  - parentBranch)` in `src/scripts/lib/dispatch-worktree.mts`. Returns `{ filesOnBranchNotOnMain: string[]
  - uncommittedWip: Array<{ path: string; status: string }> }`. Pure read-only
  - no git mutations.
- Wire into `mergeChildren` in `src/scripts/lib/dispatch-merge.mts`. BEFORE `removeChildWorktree`
  - call `inventoryWorkerBranch` for every child (DONE / CONFLICTED / FAIL). Append findings to JSONL at `.claude/artifacts/loop/dispatch/<runId>/inventory.jsonl`.
- For CONFLICTED + FAIL children with no prior audit trail
  - emit `worker-preserved-<childId>.md` at `.claude/artifacts/loop/dispatch/<runId>/worker-preserved-<childId>.md` summarizing branch
  - worktree path
  - status
  - files-on-branch-not-on-main (counts + first 10 paths)
  - uncommitted
- Out Of Scope:
  - - Destructive teardown changes (SLICE-135 / FEAT-202 SLICE-B).
- Auto-cherry-pick of on-branch commits onto main.
- Windows handle-leak root cause.
- Extending `removeChildWorktree` to CONFLICTED/FAIL children (SLICE-135).
- Cross-runId aggregation.
- Planned Files: -
- Next Step: Begin implementation

