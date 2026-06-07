---
id: SLICE-63
status: completed
feature: FEAT-061
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-06
updated: 2026-06-07
completed_at: 2026-06-07
---
# SLICE-63: Lead operates inside slice worktree

Implements FEAT-061. See [feature file](../../../backlog/in-progress/FEAT-061.md) for product context.

## Objective

FEAT-A (worktree creation) sets up the worktree but the rest of the slice ceremony still runs against the original repo cwd. FEAT-B makes loop + crew CLI calls and subagent dispatches operate inside the slice worktree so all artifacts, edits, and state writes are isolated to that branch until merge.

## In scope

- `slice start` dispatch prompt: inject `workflow-state.currentRun.worktreePath` into builder prompt body
- loop CLI subcommands (`slice complete`, `slice grade`, `slice grade-write`, `snapshot-memory`, `brief`, `stop-check`): resolve effective cwd from `workflow-state.currentRun.worktreePath` when present; honor explicit `--worktree` override
- crew CLI shell-outs from loop (`write-handoff`, `write-review-result`, `write-validation-result`, `write-final-synthesis`, `mark-badge`): forward `--repo <worktreePath>`
- add `--worktree` flag to every affected subcommand
- builder dispatch prompt template: add Worktree section with absolute path + edit-boundary reminder
- tests: state isolation, `--worktree` override, missing-worktreePath fallback to repoPath

## Out of scope

- worktree creation itself (FEAT-060 / FEAT-A — already shipped)
- auto-merge of slice branch on validation pass (FEAT-062 / FEAT-C — separate slice)
- non-loop crew invocations that the user runs by hand outside loop slash flows

## Acceptance criteria

- [ ] AC-1: `loop slice start` dispatch instruction string includes worktree absolute path in prompt body when `currentRun.worktreePath` is set
- [ ] AC-2: `loop slice complete|grade|grade-write|snapshot-memory|brief|stop-check` read `workflow-state.currentRun.worktreePath` and operate against that cwd when present; explicit `--worktree <path>` overrides; absent → fall back to `--repo`
- [ ] AC-3: crew CLI shell-outs forward `--repo <effectiveWorktreePath>` (not original repo) when worktreePath is active
- [ ] AC-4: builder dispatch prompt template includes a `## Worktree` section with absolute path + reminder to keep edits inside it
- [ ] AC-5: state isolation — `workflow-state.json` and `slice-progress.md` writes during a slice with worktreePath active land in the worktree's `.claude/state/crew/`, not the main repo's
- [ ] AC-6: every affected subcommand accepts `--worktree <path>` for manual override / debugging
- [ ] AC-7: tests cover (a) state isolation (worktree writes do not leak to main repo state), (b) explicit `--worktree` override beats `currentRun.worktreePath`, (c) missing `worktreePath` falls back to `repoPath` gracefully
- [ ] AC-8: `npm test` and `npm run lint` clean

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-061 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A (correctness): verify worktree cwd resolution precedence (`--worktree` > `currentRun.worktreePath` > `--repo`); audit every affected subcommand for consistent resolution path; confirm crew shell-outs forward correct `--repo`.
- Reviewer B (isolation + regression): verify main-repo `.claude/state/crew/` is untouched during a worktree slice; trace fallback path when `worktreePath` absent; confirm existing slices without worktrees still work.
