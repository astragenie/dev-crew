---
id: FEAT-060
status: in-progress
priority: P1
category: workflow
target_release: null
created: 2026-06-06
updated: 2026-06-06
depends_on: []
slices: [SLICE-55, SLICE-56]
derived_from: null
pm_customer_impact: 0.8
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.85
pm_technical_risk: 0.35
pm_dependency_depth: 0.05
composite_score: 0.7575
autonomous_safe: true
triage_notes: "autonomous_safe inferred: AC count=8, derived_from=null → true"
started_at: 2026-06-06
slices_complete: [SLICE-56]
github_issue: 125
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/125"
---
# FEAT-060: Worktree creation at slice-start

Slices currently share the repo working tree. If one slice's edits break the build mid-way, subsequent slices cannot proceed in parallel and the operator's editor is held hostage by the active slice. Worktrees fix this.

Acceptance criteria:
- AC-1: node scripts/loop.mjs slice start creates a git worktree at ../<repo>-worktrees/<SLICE-NN>/ when worktree mode is enabled and the slice has no existing worktreePath
- AC-2: a new branch slice/<SLICE-NN>-<feat-id> is checked out in the worktree off main
- AC-3: workflow-state.currentRun.worktreePath + slice frontmatter worktreePath are populated with the absolute path
- AC-4: idempotent re-run of slice-start on an existing worktree reuses the path (no error, no reset)
- AC-5: new config loop.worktreeMode (default false initially; flipped to true after FEAT-B + FEAT-C land) gates the behavior; when false, slice-start behaves exactly as today
- AC-6: new loop.json config loop.worktreeRoot (default ../<repo>-worktrees) for operators who want a different sibling directory
- AC-7: failure path - if git worktree add fails (dirty tree, lock, etc.) slice-start halts with a clear actionable error instead of leaving stale state
- AC-8: tests cover worktree-mode-on creates and writes state, worktree-mode-off skips entirely, re-entry reuses existing path, git failure surfaces error

Depends on: none. Prereq for FEAT-B (operate inside worktree) and FEAT-C (auto-merge at slice-complete). Ship A standalone first.