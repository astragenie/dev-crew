---
id: PM-REVIEW-FEAT-267
feature: FEAT-267
reviewed_at: 2026-07-19
pm_customer_impact: 0.75
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.65
pm_technical_risk: 0.6
pm_dependency_depth: 0.15
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-267

## Demand Assessment

- **Evidence:** FEAT body: 'Two defects surfaced by an interrupted wave-0 run (2026-07-19)'; corroborated live by untracked .-feat236-0/.-feat249-0/.-feat266-0 dirs in git status and same-day manual-salvage commit 93185dfa. marathonRunner: 'wave' is this repo's live default (.claude/loop.json:107).

## Scope Challenge

- **Scope notes:** Smallest deliverable = worktree-placement fix alone (createChildWorktree repoRoot resolution). Cut-if-halved = defer dispatch-recover CLI to a follow-up slice. No overlap with worktree-manager.mts (already resolves sibling path correctly) or any existing FEAT.

## Scores

- customer_impact: 0.75
- effort_estimate: 0.55
- strategic_alignment: 0.65
- technical_risk: 0.60
- dependency_depth: 0.15

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: P1: high customer_impact + core-mission strategic_alignment (loop's own crash durability) outweigh moderate effort/risk; technical_risk banded at 0.6 because the FEAT bundles a trivial placement fix with a cross-module state-recovery capability — scored to the harder half, not averaged.

## Risks

- Cascade: dispatch-recover touches finalize/merge paths into main — a bad merge from stale interrupted state corrupts main for the whole backlog walk.
- Pre-mortem 1: recover re-drives merge against a child whose live state no longer matches worktrees.jsonl (worktree manually deleted, branch rebased/force-pushed).
- Pre-mortem 2: placement fix reverts cleanly via git revert; recovery/merge half does not.
- Pre-mortem 3: no existing test constructs an interrupted-run fixture (stale worktrees.jsonl + mixed DONE/no-marker children).
