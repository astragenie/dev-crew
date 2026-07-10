---
id: FEAT-249
status: pending
priority: null
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: []
slices: []
derived_from: null
---
## Description

Fix wave-run self-blocking dirty-tree check: 'wave run' writes its plan artifact under .claude/artifacts/loop/waves/<waveId>/ BEFORE dispatch prepare calls preflightGitClean (dispatch-worktree.mts), which rejects ANY git status --porcelain output — so every wave run fails with 'working tree dirty on main' caused by its own artifact write. Reproduced 2026-07-09 twice (wave 2026-07-09T20-22-47, 2026-07-09T20-23-51). Workaround shipped: .claude/artifacts/loop/waves/ gitignored. Proper fix options: (a) write plan artifact AFTER preflight, (b) preflight allowlist for loop-owned artifact paths, (c) preflight only rejects tracked modifications (ignore untracked artifacts). Pick (a) unless artifact needed for crash forensics before prepare; then (b). Remove the .gitignore workaround + restore artifact commits when fixed.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.