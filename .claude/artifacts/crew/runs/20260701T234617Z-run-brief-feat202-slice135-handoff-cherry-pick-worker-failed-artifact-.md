---
feature: FEAT-202
status: active
---
# Run Brief: FEAT202 SLICE135: Handoff cherry-pick + worker-failed artifact (partial SLICE-B — no destructive rmdir)

- Created: 2026-07-01T23:46:17.598Z
- Tier: full
- Goal: Prevent silent loss of handoff artifacts on CONFLICTED/FAIL worker branches during `mergeChildren`. Auto-cherry-pick handoff .md files onto main before teardown. Cherry-pick failure aborts cleanly (`git cherry-pick --abort`) and logs preservation reason. Emit `worker-failed-<childId>.md` artifact for FAIL children (mirroring SLICE-134's worker-preserved for CONFLICTED).
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New `cherryPickHandoffsFromBranch(repoRoot
  - branch
  - parentBranch)` in `src/scripts/lib/dispatch-worktree.mts`. Identifies committed files under `.claude/artifacts/crew/handoffs/` (or any `*handoff*.md` under `.claude/artifacts/`) present on the worker branch but absent on `parentBranch`. Cherry-picks each commit that introduced them onto `parentBranch`. Returns `{ cherryPicked: string[]
  - skippedConflict: string[]
  - aborted: boolean }`. On cherry-pick conflict
  - aborts (`git cherry-pick --abort`) and returns skippedConflict list — parent branch state unchanged.
- Wire into `mergeChildren` in `src/scripts/lib/dispatch-merge.mts`. For every CONFLICTED and FAIL child (before its `worker-preserved`/`worker-failed` artifact is written)
  - invoke `cherryPickHandoffsFromBranch`. Log outcome to inven
- Out Of Scope: -
- Planned Files: -
- Next Step: Begin implementation

