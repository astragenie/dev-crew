---
id: FEAT-261
status: pending
priority: null
category: feature
target_release: null
created: 2026-07-10
updated: 2026-07-10
depends_on: []
slices: []
derived_from: null
---
## Description

Wave dispatch bases parallel worktrees on divergent stale local refs instead of the invoking branch HEAD. Observed 2026-07-10 wave 2026-07-10T07-20-26-195Z: one worktree based on a 21-commits-behind ref missing DEC-076/FEAT-250 entirely, the other on last night's retro branch — builder re-authored ACs and allocated colliding ids (SLICE-148, DEC-076) requiring manual hand-port + renumber at merge. Fix: dispatch worktree creation must use the invoking checkout's HEAD (or explicit --base ref) and fail loudly if the base lacks the slice file being dispatched. Evidence: dispatch ledger .claude/artifacts/loop/dispatch/2026-07-10T07-20-26-601Z-e2859b/worktrees.jsonl, grade lessons in 20260710T074444Z-feat250-slice151-grade.md.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.