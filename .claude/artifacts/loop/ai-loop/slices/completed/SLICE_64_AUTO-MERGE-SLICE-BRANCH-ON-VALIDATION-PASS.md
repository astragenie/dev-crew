---
id: SLICE-64
status: completed
feature: FEAT-062
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-07
updated: 2026-06-07
completed_at: 2026-06-07
---
# SLICE-64: Auto-merge slice branch on validation pass

Implements FEAT-062. See [feature file](../../../backlog/in-progress/FEAT-062.md) for product context.

## Objective

After FEAT-A + FEAT-B ship, slices run isolated in a worktree but the operator still has to manually merge back to main. FEAT-C closes the loop: slice-complete reads the validation badge; on PASS it squash-merges the slice branch into main, pushes main, deletes the slice branch + worktree. On FAIL it holds the worktree for /crew:fix.

## In scope

- New auto-merge stage at end of `loop slice complete` when `workflow-state.currentRun.worktreePath` is set
- Validation-gate read: require `validation_passed` or `validation_skipped` badge; halt with `validation_required` otherwise
- Merge sequence: `git -C <mainRepo> fetch`, rebase slice branch onto latest main, squash-merge with synthesized commit message (slice title + grade avg + DEC ids)
- Cleanup on success: delete slice branch (`-d`), `git worktree remove`, clear `workflow-state.currentRun.worktreePath`
- Failure path: rebase conflict / `validation_failed` / merge failure → set `merge_failed` badge in workflow-state, preserve worktree + branch, return error pointing operator to `/crew:fix`
- New flags on `slice complete`: `--no-merge` (preserve worktree, skip merge), `--dry-run` (print plan, no side effects)
- New `loop.autoPushOnMerge` config (default `false`); when `true`, post-merge `git push origin main`
- Tests: pass-path full merge + cleanup, fail-path holds worktree, rebase conflict, `--no-merge` passthrough, `--dry-run` zero side effects, `autoPushOnMerge` flag honored
- Commit message footer matches existing repo style (`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`)

## Out of scope

- Worktree creation (FEAT-060) and worktree-aware ceremony (FEAT-061) — already shipped
- Auto-merging when no worktree is active (no-op path)
- Cross-branch merges to anything other than `main` (out of scope; future FEAT)
- Auto-push when `autoPushOnMerge: false` (default — operator pushes manually)
- Force-push handling (never auto, even on conflict)

## Acceptance criteria

- [ ] AC-1: `loop slice complete` reads `workflow-state.currentRun.gates.validation` (or equivalent badge); if absent or not `validation_passed` / `validation_skipped`, halts with `validation_required` error and performs NO merge
- [ ] AC-2: On PASS + worktree active, runs `git -C <mainRepo> fetch origin`, rebases slice branch onto latest `origin/main`, squash-merges into `main` with commit message: `<sliceTitle>\n\nGrade avg: <N.NN>. Decisions: DEC-NNN, DEC-MMM.\n\n<Co-Authored-By footer>`
- [ ] AC-3: Commit message footer line `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` and references slice id + feature id in body
- [ ] AC-4: `loop.autoPushOnMerge` config (default `false`) — when `true`, runs `git push origin main` after merge succeeds; when `false` or absent, no push
- [ ] AC-5: On successful merge: `git branch -D slice/<SLICE-NN>` (force-delete required because `git merge --squash` does not mark the source branch as merged in git's eyes — the squashed commit on main has a different sha than the branch tip; cleanup runs only after the squash commit is verified on main, so `-D` is safe here), `git worktree remove <worktreePath>`, clear `workflow-state.currentRun.worktreePath` (set to `null`)
- [ ] AC-6: Failure paths — `validation_failed` badge, rebase conflict, or merge error → preserve worktree + branch, set `merge_failed` badge with diagnostic note, return error payload pointing to `/crew:fix`
- [ ] AC-7: `--no-merge` flag on `loop slice complete` skips merge + cleanup entirely; worktree preserved; existing close ceremony (slice/file move, feature roll, grade prefill) still runs
- [ ] AC-8: `--dry-run` flag prints planned actions (rebase target, commit message, push decision, cleanup steps) to stdout and exits without touching git, worktree, or workflow-state
- [ ] AC-9: Tests cover (a) pass-path full merge + cleanup, (b) `validation_failed` halts cleanly, (c) rebase-conflict halts cleanly with `merge_failed` badge, (d) `--no-merge` passthrough, (e) `--dry-run` zero side effects, (f) `autoPushOnMerge: true` triggers push, `autoPushOnMerge: false` does not
- [ ] AC-10: `npm test` and `npm run lint` clean

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-062 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A (git safety): verify NEVER force-pushes; verify `validation_required` halt blocks merge in absence of explicit pass; verify `git branch -D` only runs AFTER the squash commit is verified on main (no orphan-branch-delete path); verify rebase failure surfaces cleanly with `merge_failed` badge; verify `--dry-run` is truly side-effect-free including no workflow-state writes.
- Reviewer B (autonomous-loop boundary): verify the auto-push path is opt-in via config (default false), not silently on; confirm `--no-merge` and `--dry-run` flag semantics are documented in CLI help; verify failure preserves enough state for `/crew:fix` to resume; trace what happens when `worktreePath` is absent (legacy slices) — must no-op cleanly.
