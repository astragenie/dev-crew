---
id: FEAT-249
status: done
priority: P1
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-19
depends_on: []
slices: []
derived_from: null
github_issue: 500
github_url: "https://github.com/astragenie/runner-plugin/issues/500"
pm_customer_impact: 0.7
pm_effort_estimate: 0.25
pm_strategic_alignment: 0.5
pm_technical_risk: 0.35
pm_dependency_depth: 0.05
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-07-19
autonomous_safe: true
triage_notes: "P1: high customer_impact (blocks every run of an entire opt-in loop mode, twice-reproduced, workaround already required) combined with low effort (bounded, reporter-scoped) justifies prioritizing ahead of the P2 hygiene items in this batch. technical_risk 0.35 (0.3-0.5 band: touches the dispatch preflight gate, a HARD-RULE-adjacent path per CLAUDE.md, but is a known-pattern reorder/allowlist fix in 1-2 files with clean git-revert rollback) — pre-mortem completed above as required for P1 regardless of the risk band."
tags: [be]
needs_contract: false
needs_ux: false
---
## Description

Fix wave-run self-blocking dirty-tree check: 'wave run' writes its plan artifact under .claude/artifacts/loop/waves/<waveId>/ BEFORE dispatch prepare calls preflightGitClean (dispatch-worktree.mts), which rejects ANY git status --porcelain output — so every wave run fails with 'working tree dirty on main' caused by its own artifact write. Reproduced 2026-07-09 twice (wave 2026-07-09T20-22-47, 2026-07-09T20-23-51). Workaround shipped: .claude/artifacts/loop/waves/ gitignored. Proper fix options: (a) write plan artifact AFTER preflight, (b) preflight allowlist for loop-owned artifact paths, (c) preflight only rejects tracked modifications (ignore untracked artifacts). Pick (a) unless artifact needed for crash forensics before prepare; then (b). Remove the .gitignore workaround + restore artifact commits when fixed.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.