---
id: FEAT-061
status: triaged
priority: P1
category: workflow
target_release: null
created: 2026-06-06
updated: 2026-06-06
depends_on: [FEAT-060]
slices: []
derived_from: null
pm_customer_impact: 0.7
pm_effort_estimate: 0.6
pm_strategic_alignment: 0.82
pm_technical_risk: 0.45
pm_dependency_depth: 0.5
composite_score: 0.651
autonomous_safe: true
triage_notes: "autonomous_safe inferred: AC count=7, derived_from=null → true"
---
# FEAT-061: Lead operates inside slice worktree

FEAT-A (worktree creation) sets up the worktree but the rest of the slice ceremony still runs against the original repo cwd. FEAT-B makes loop + crew CLI calls and subagent dispatches operate inside the slice worktree so all artifacts, edits, and state writes are isolated to that branch until merge.

Acceptance criteria:
- AC-1: slice start dispatch instruction includes the worktree absolute path in the dispatch prompt body so subagents know where to operate
- AC-2: subsequent loop CLI subcommands (slice complete, slice grade, slice grade-write, snapshot-memory, brief, stop-check) read workflow-state.currentRun.worktreePath and operate against that cwd when present; explicit --worktree flag overrides
- AC-3: crew CLI calls (write-handoff, write-review-result, write-validation-result, write-final-synthesis, mark-badge) forward --repo <worktreePath> instead of original repo
- AC-4: subagent dispatch prompt template includes a Worktree section with absolute path + reminder to keep edits inside it
- AC-5: state read/write isolation - workflow-state.json and slice progress live inside worktree until merge; main repo state untouched
- AC-6: new --worktree CLI flag on every affected subcommand for manual override / debugging
- AC-7: tests cover state isolation (changes in worktree do not leak to main repo state), explicit --worktree override, missing worktreePath falls back to repoPath gracefully

Depends on: FEAT-A. Prereq for FEAT-C.