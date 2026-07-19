---
id: FEAT-267
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-07-19
updated: 2026-07-19
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.75
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.65
pm_technical_risk: 0.6
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-07-19
autonomous_safe: false
triage_notes: "P1: high customer_impact + core-mission strategic_alignment (loop's own crash durability) outweigh moderate effort/risk; technical_risk banded at 0.6 because the FEAT bundles a trivial placement fix with a cross-module state-recovery capability — scored to the harder half, not averaged."
---
## Description

Wave-mode crash recovery + worktree placement hardening. Two defects surfaced by an interrupted wave-0 run (2026-07-19): (1) wave/dispatch worktrees are created INSIDE the repo root as .-featNNN-0 dirs instead of a sibling ../runner-plugin-worktrees/ location, so they show as untracked ?? entries in git status and pollute the primary working tree; (2) when a wave is interrupted after children commit but before the merge-back/finalize step, there is no automatic recovery — child branches, uncommitted finish-work, and DONE result markers (dispatch/<run>/worktrees.jsonl + *.result.json) are left stranded and must be salvaged by hand. Goal: (a) place child worktrees outside the repo tree by default; (b) a 'dispatch recover --run-id' (or wave resume) path that reads the worktrees.jsonl + result markers of an interrupted run and re-drives finalize/merge for DONE children, surfacing partial/uncommitted children for review instead of silently losing them. FEAT-249's preflightGitClean allowlist was step 1 of this hardening.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a wave dispatch running with repoRoot resolved to an absolute path, When createChildWorktree (src/scripts/lib/dispatch-worktree.mts) computes the child worktree path for childId="feat267" depth=0, Then the resulting worktreePath is a sibling directory <dirname(repoRoot)>\runner-plugin-feat267-0 outside the repo tree, and git status --porcelain shows no untracked entry for it.
- AC-2: Given createChildWorktree is invoked with a relative repoRoot of "." (the reported defect), When it computes worktreePath, Then it MUST path.resolve() repoRoot before deriving dirname/basename so the result is still the correct sibling directory, not a ".-feat267-0" in-repo dir — a regression test pinning this exact failure mode must exist under src/tests/.
- AC-3: Given an interrupted run's worktrees.jsonl records 3 children with 2 DONE result markers and 1 with no marker, When the operator runs `dispatch recover --run-id <runId>`, Then the 2 DONE children are merged via the existing dispatch-merge.mts/auto-merge.mts path, worktrees.jsonl (or a completion marker) is updated, and the command exits 0.
- AC-4: Given the same run's remaining child has no result marker AND uncommitted worktree changes, When dispatch recover processes it, Then it must NOT merge or discard it — it calls the existing writeWorkerPreservedArtifact to write worker-preserved-<childId>.md, leaves the worktree/branch intact, and reports the child as needs_manual_review.
- AC-5: Given `dispatch recover --run-id <runId>` is invoked for a runId whose worktrees.jsonl does not exist, When the command runs, Then it exits non-zero with an explicit missing-path error and performs no merge/finalize side effect.
- AC-6: Given dispatch recover finishes processing all children, When it completes, Then it writes a structured summary (per-child merged/preserved/failed outcome) so recovery outcomes are auditable without re-deriving them from raw worktrees.jsonl + git state.
