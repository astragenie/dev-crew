---
id: SLICE-135
title: Handoff cherry-pick + worker-failed artifact (partial SLICE-B — no destructive rmdir)
status: completed
feature: FEAT-202
phase: null
priority: P2
target_release: null
requires_validation: false
requires_validation_reason: Additive non-destructive git operations covered by unit tests. Cherry-pick failure aborts cleanly; worktree preservation unchanged.
risk: medium
created: 2026-07-01
updated: 2026-07-01
effort_points: 2
touches_files: [src/scripts/lib/dispatch-merge.mts, src/scripts/lib/dispatch-worktree.mts, src/tests/dispatch-cherrypick-handoffs.test.mts]
completed_at: 2026-07-01
---
# SLICE-135: Handoff cherry-pick + worker-failed artifact (partial SLICE-B)

Implements FEAT-202 SLICE-B **partial** — cherry-pick handoff artifacts onto main + emit `worker-failed-<childId>.md` for FAIL children. **Excludes** destructive rmdir/branch-delete extensions + Windows handle-leak detection (deferred to a future slice per user decision 2026-07-01).

## Objective

Prevent silent loss of handoff artifacts on CONFLICTED/FAIL worker branches during `mergeChildren`. Auto-cherry-pick handoff .md files onto main before teardown. Cherry-pick failure aborts cleanly (`git cherry-pick --abort`) and logs preservation reason. Emit `worker-failed-<childId>.md` artifact for FAIL children (mirroring SLICE-134's worker-preserved for CONFLICTED).

## In scope

- New `cherryPickHandoffsFromBranch(repoRoot, branch, parentBranch)` in `src/scripts/lib/dispatch-worktree.mts`. Identifies committed files under `.claude/artifacts/crew/handoffs/` (or any `*handoff*.md` under `.claude/artifacts/`) present on the worker branch but absent on `parentBranch`. Cherry-picks each commit that introduced them onto `parentBranch`. Returns `{ cherryPicked: string[], skippedConflict: string[], aborted: boolean }`. On cherry-pick conflict, aborts (`git cherry-pick --abort`) and returns skippedConflict list — parent branch state unchanged.
- Wire into `mergeChildren` in `src/scripts/lib/dispatch-merge.mts`. For every CONFLICTED and FAIL child (before its `worker-preserved`/`worker-failed` artifact is written), invoke `cherryPickHandoffsFromBranch`. Log outcome to inventory JSONL as `cherryPickResult` field.
- Extend `emitPreservedArtifacts` (or add sibling `emitFailedArtifacts`) to emit `worker-failed-<childId>.md` for FAIL children — same shape as `worker-preserved` from SLICE-134, but with header "WORKER FAILED" and next-action "cherry-pick was attempted (see inventory.jsonl); manual review required".
- 3+ tests in `src/tests/dispatch-cherrypick-handoffs.test.mts` covering: (a) handoff-only-on-branch → cherry-picked onto main; (b) handoff triggers conflict → abort clean, skippedConflict populated, parent branch unchanged; (c) no handoff on branch → cherry-picked = [], no-op.

## Out of scope (deferred)

- Extending `removeChildWorktree` to CONFLICTED/FAIL children.
- Operator-prompt for destructive teardown.
- Default-keep on rmdir failure.
- Windows handle-leak detection (VS Code TS server / Tailwind oxide.node).
- Auto-prune stale branches.
- Cross-runId aggregation.

## Acceptance criteria

- [ ] AC-1: `cherryPickHandoffsFromBranch(repoRoot, branch, parentBranch)` exported from `src/scripts/lib/dispatch-worktree.mts`. Returns `{ cherryPicked: string[]; skippedConflict: string[]; aborted: boolean }`. Identifies handoff candidates via `git log parentBranch..branch --name-only --diff-filter=A` filtered to paths matching `.claude/artifacts/crew/handoffs/**/*.md` OR `**/*handoff*.md` under `.claude/artifacts/`. For each unique commit that added a candidate, runs `git cherry-pick <sha>` on `parentBranch`. On non-zero exit, runs `git cherry-pick --abort` and adds the sha's paths to `skippedConflict`. Returns synchronously after processing all candidates.
- [ ] AC-2: `mergeChildren` in `src/scripts/lib/dispatch-merge.mts` calls `cherryPickHandoffsFromBranch` for every CONFLICTED and FAIL child BEFORE emitting the preserved/failed artifact. Result is appended to that child's inventory JSONL line under `cherryPickResult: { cherryPicked, skippedConflict, aborted }`. DONE children skip cherry-pick (already merged).
- [ ] AC-3: `worker-failed-<childId>.md` emitted at `.claude/artifacts/loop/dispatch/<runId>/worker-failed-<childId>.md` for every FAIL child. Sections: branch name, worktree path, status (FAIL), `filesOnBranchNotOnMain` count + first 10 paths, `uncommittedWip` count + first 10 paths, cherry-pick result summary (count picked + count skipped), one-line next-action ("Manual review required — worktree preserved").
- [ ] AC-4: Tests in `src/tests/dispatch-cherrypick-handoffs.test.mts` cover ≥ 3 cases: (a) branch with committed `.claude/artifacts/crew/handoffs/handoff-A.md` on branch not on main → returns `{ cherryPicked: ["...handoff-A.md"], skippedConflict: [], aborted: false }` and main branch tip has the file; (b) parent branch already has different content at the same path → cherry-pick conflicts → returns `{ cherryPicked: [], skippedConflict: ["...handoff-A.md"], aborted: true }` and parent branch tip unchanged; (c) branch has no handoff paths → returns `{ cherryPicked: [], skippedConflict: [], aborted: false }`. Tests spin up temp git repo.
- [ ] AC-5: NO destructive teardown operations added. Grep for `git.*worktree.*remove`, `git.*branch.*-D`, `rmdir`, `rm -r` in this slice's diff MUST show only pre-existing call sites. Cherry-pick is destructive on parent-branch commit history but only ADDS commits (never removes) — this is intentional and covered by test (a).
- [ ] AC-6: `bunx tsc --project tsconfig.json --noEmit` clean. `bunx tsc --project tsconfig.test.json --noEmit` clean. `bun test src/tests/dispatch-cherrypick-handoffs.test.mts --timeout 60000` PASS. `bunx eslint src/scripts/lib/dispatch-worktree.mts src/scripts/lib/dispatch-merge.mts src/tests/dispatch-cherrypick-handoffs.test.mts` zero new warnings.
- [ ] AC-7: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and linter is clean (`bunx eslint src eslint.config.mjs`).

## Done When

- all ACs PASS
- FEAT-202 moves to `done/` (SLICE-135 partial closes the FEAT for now; destructive teardown deferred as separate future FEAT if pain recurs)
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: correctness — cherry-pick commit selection (are we picking the RIGHT commits — those that introduced handoff paths, not merge/rename commits), abort atomicity, parent-branch tip integrity after conflict.
- Reviewer B: production-readiness — cherry-pick side effects (staged state, index cleanup after abort), no regressions on DONE children, worker-failed MD path collision on duplicate childId.
