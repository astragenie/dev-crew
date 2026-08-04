---
id: FEAT-277
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-03
updated: 2026-08-03
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.4
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.4
pm_technical_risk: 0.7
pm_dependency_depth: 0.15
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-08-03
autonomous_safe: false
triage_notes: "P2: moderate customer_impact (disk/confusion hygiene, not blocking) and moderate strategic_alignment (ops tooling, not mission-differentiating) are offset upward by elevated technical_risk (0.7, weighted per the destructive/hard-to-reverse-effects criterion rather than pattern novelty) which argues for careful, non-autonomous rollout rather than urgency — landing at P2 with autonomous_safe=false."
---
## Description

Worktree and runId leak: no reaper for orphaned dispatch worktrees or never-finalized runs. Evidence (2026-08-03 sweep): git worktree list shows 6 orphan worktrees under C:/work/mega/runner-plugin-worktrees/ -- backfill, feat-reconcile, fix-427-close-ceremony, fix-481-tdz, fix-format, release-073 -- the oldest (release-073, branch chore/release-v0.73.0) dead since the v0.73.0 release roughly three weeks ago. Separately .claude/artifacts/loop/dispatch/ holds 2 runId directories from 2026-08-02 (2026-08-02T15-04-22-564Z-66ec2f, 2026-08-02T15-20-15-790Z-577a3a) that were never finalized. loop-snapshot.md reports 'Worktree count (open runs): 2' -- it counts only tracked open runIds and is blind to the 6 git-level orphans, so the leak is invisible in the very telemetry meant to surface it. Cost is disk plus operator confusion plus stale branches that look active in git worktree list. Fix: add a reap/gc subcommand (e.g. loop.mts dispatch reap) that (a) lists git worktrees under the configured worktrees root and cross-references them against open runIds and merged/deleted branches, (b) reports orphans with age and last-commit, (c) removes them only behind an explicit --prune flag with a dry-run default, and (d) finalizes or marks abandoned any runId directory older than a configurable age. Must never remove a worktree with uncommitted changes or unmerged commits -- report those for manual handling instead.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the reap/prune command is invoked with no additional flags, When it runs, Then it only lists and reports orphaned worktrees and stale runId directories (age, last-commit, dirty/unmerged status) and makes zero destructive filesystem or git changes — dry-run is the default behavior, not an opt-in flag.
- AC-2: Given the operator passes an explicit `--prune` flag, When the command runs, Then only worktrees that are BOTH (a) unreferenced by any open/in-flight runId and (b) clean (`git status --porcelain` empty) and (c) fully merged (no commits on the branch absent from main) are removed via `git worktree remove --force` + `git branch -D`.
- AC-3 (edge/failure): Given an orphaned worktree has uncommitted changes OR unmerged commits, When reap runs with `--prune`, Then that worktree is NOT removed — it is listed in a distinct 'needs manual handling' section of the report with the specific reason (dirty | unmerged | both).
- AC-4: Given 6 real orphan worktrees exist under the configured worktrees root that are absent from every runId's worktrees.jsonl (e.g. manually-created branches like release-073), When reap runs, Then all 6 are surfaced in its report with age and last-commit — closing the current blind spot where loop-snapshot.md's 'Worktree count (open runs)' only counts tracked runIds, and a regression test pins this cross-reference behavior against a fixture with an untracked worktree.
- AC-5: Given a runId directory older than the configured age threshold with no summary.md and no recent trace.jsonl activity, When reap runs, Then it is finalized-or-marked-abandoned by reusing the existing dispatch-prune.mts age-override logic (isInFlight/IN_FLIGHT_AGE_OVERRIDE_MULTIPLIER) rather than reimplementing it.
