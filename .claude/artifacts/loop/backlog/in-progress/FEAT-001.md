---
id: FEAT-001
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: []
slices: [SLICE-01, SLICE-02, SLICE-03]
derived_from: null
pm_customer_impact: 0.6
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.9
pm_technical_risk: 0.65
pm_dependency_depth: 0.2
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-18
autonomous_safe: false
triage_notes: "Prerequisite phase, strategically necessary (P1) but writes outside this repo's boundary to two parent repos' main branches -- technical_risk banded 0.65 (cross-repo reach, clean-ish rollback via git revert/tag delete, no schema/data-shape change) forces the mandatory pre-mortem; autonomousSafe=false because cross-repo writes plus the plan's own DRAFT/awaiting-approval status (unification-plan.md line 6) means no phase should auto-execute without an explicit operator go."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Merge wave-1 reviewed branches to runner main
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Disposition in-flight FEATs 230/259/284/299
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: "28-FEAT bucket sweep, worktree salvage, baseline tags"
    points: 2
    estimated_tokens: 100000
arch_attempt: 0
arch_status: approved
arch_review: approved
tags: ["stack:typescript", "area:repo-ops", "concern:cross-repo-merge"]
needs_contract: false
needs_ux: false
started_at: 2026-08-18
slices_complete: [SLICE-01]
---
## Description

P0 Parent estate settlement: settle runner-plugin in-flight work before the devcrew subtree import. Merge reviewed-but-unmerged wave-1 branches (SLICE-205/206/208 -> FEAT-295/297/296) to runner main and close via ceremony; check FEAT-299/SLICE-207 state (merge if reviewed, else carry); disposition FEAT-230/259/284 (carry remaining slices to dev-crew or close with reason); three-bucket sweep of all 28 triaged FEATs (moot/carry/defer, no silent drops); salvage-or-delete 6 stale worktree branches; tag both parents pre-devcrew-baseline. Rule: build nothing new in runner-plugin. Serialized, runs in parent repos. Full spec: docs/planning/unification-plan.md section 6b + P0 row.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given SLICE-205/206/208 (FEAT-295/297/296) are built+reviewed+green and unmerged on branches main-SLICE-205/206/208 in runner-plugin, When the P0 merge step runs, Then `git log main --grep=SLICE-205` (and 206/208) in runner-plugin returns a commit and `git branch --merged main` lists all three branches.
- AC-2: Given FEAT-299/SLICE-207's worktree state is unresolved, When the P0 disposition check runs, Then either a merge commit referencing SLICE-207 exists on runner-plugin main, or FEAT-299's frontmatter in dev-crew's imported backlog carries an explicit disposition field with a reason string.
- AC-3: Given the 28 triaged FEATs in runner-plugin's .claude/artifacts/loop/backlog/triaged/, When the three-bucket sweep completes, Then every one of the 28 FEAT files has a `p0_bucket: moot|carry|defer` frontmatter field -- grep count of files containing the field must equal grep count of files in triaged/.
- AC-4: Given a stale worktree branch (e.g. fix-427, fix-481) has no salvageable diff against main, When the salvage-or-delete pass evaluates it, Then the branch is deleted and its disposition (no-delta / salvaged-into-commit-<sha>) is recorded in the P0 slice's handoff artifact -- a branch left neither merged, deleted, nor recorded fails this AC.
- AC-5: Given P0 completes, When `git tag --list "pre-devcrew-baseline*"` runs in both C:\work\mega\dev-team and C:\work\mega\runner-plugin, Then exactly one matching tag exists in each repo pointing at the final pre-import commit.

## Proposed slices (PM decomposition)

- SLICE-1: Merge wave-1 reviewed branches to runner main (2 pts)
- SLICE-2: Disposition in-flight FEATs 230/259/284/299 (2 pts)
- SLICE-3: 28-FEAT bucket sweep, worktree salvage, baseline tags (2 pts)
