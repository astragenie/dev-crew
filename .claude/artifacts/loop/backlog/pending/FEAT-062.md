---
id: FEAT-062
status: pending
priority: P1
category: workflow
target_release: null
created: 2026-06-06
updated: 2026-06-06
depends_on: [FEAT-060, FEAT-061]
slices: []
derived_from: null
---
# FEAT-062: Auto-merge slice branch on validation pass

After FEAT-A + FEAT-B ship, slices run isolated in a worktree but the operator still has to manually merge back to main. FEAT-C closes the loop: slice-complete reads the validation badge; on PASS it squash-merges the slice branch into main, pushes main, deletes the slice branch + worktree. On FAIL it holds the worktree for /crew:fix.

Acceptance criteria:
- AC-1: slice complete reads workflow-state validation gate; if absent or not validation_passed/validation_skipped, halts with validation_required error (no merge)
- AC-2: on PASS, slice complete runs git -C <mainRepo> fetch; rebase slice branch onto latest main; squash-merge with synthesized commit message (slice title + grade avg + DEC ids)
- AC-3: commit message template includes Co-Authored-By footer matching today's style and references slice + feature ids
- AC-4: loop.json new config loop.autoPushOnMerge (default false initially; user-tunable) - when true, slice complete also runs git push origin main after merge
- AC-5: after successful merge: delete slice branch (-d), remove worktree (git worktree remove), clear workflow-state.currentRun.worktreePath
- AC-6: failure path - validation_failed badge or merge conflict during rebase halts cleanly: worktree + branch preserved, workflow-state badge merge_failed set, operator instructed to run /crew:fix
- AC-7: --no-merge flag on slice complete keeps worktree for manual control
- AC-8: --dry-run flag prints what would happen without acting
- AC-9: tests cover pass-path full merge + cleanup, fail-path holds worktree, rebase conflict path, --no-merge passthrough, --dry-run no side effects, autoPushOnMerge flag honored

Depends on: FEAT-A, FEAT-B. Final piece of the worktree trilogy.