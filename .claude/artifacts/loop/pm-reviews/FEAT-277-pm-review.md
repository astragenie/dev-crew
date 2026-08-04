---
id: PM-REVIEW-FEAT-277
feature: FEAT-277
reviewed_at: 2026-08-03
pm_customer_impact: 0.4
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.4
pm_technical_risk: 0.7
pm_dependency_depth: 0.15
composite_priority: P2
autonomous_safe: false
---
# PM Review — FEAT-277

## Demand Assessment

- **Evidence:** 2026-08-03 repo sweep (quoted in FEAT body): git worktree list confirmed 6 orphan worktrees under C:/work/mega/runner-plugin-worktrees/ (backfill, feat-reconcile, fix-427-close-ceremony, fix-481-tdz, fix-format, release-073), oldest (release-073) dead ~3 weeks since the v0.73.0 release. Read src/scripts/lib/dispatch-prune.mts + src/scripts/dispatch.mts:367-424 in full: a reaper (`bun src/scripts/dispatch.mts prune`) ALREADY EXISTS from FEAT-205/SLICE-138 (2026-07-02 cost report on file: ~$19.73 attributed, 33 msgs in this repo), but it only tears down worktrees/branches registered in a tracked runId's worktrees.jsonl under .claude/artifacts/loop/dispatch/<runId>/ — it has no `git worktree list` cross-reference step, so the 6 manually-named orphans above (which don't match any runId or wave/<id>/<slice> branch pattern) are structurally invisible to it, matching the FEAT's claim that loop-snapshot.md's 'Worktree count (open runs): 2' is blind to git-level orphans. Also confirmed at dispatch.mts:369: `const dryRun = args.dryRun ?? false` — the existing prune command defaults to LIVE apply and requires explicit `--dry-run` to preview, the opposite of what this FEAT (and the team's stated risk framing) requires.

## Scope Challenge

- **Scope notes:** This is an extension, not a greenfield build: dispatch-prune.mts already supplies reusable age computation (runIdAgeDays/parseRunIdDate), an in-flight guard with a documented age-override, and tested worktree-remove/branch-delete plumbing (src/tests/dispatch-prune.test.mts). Recommend extending `dispatch prune` (or adding `dispatch reap` as a thin wrapper that also runs a `git worktree list --porcelain` cross-reference against every open runId's worktrees.jsonl plus merged-branch state) rather than building a fully separate command — two divergent reaper code paths would be its own maintenance risk. Effort calibration: SLICE-138 (the original dispatch-prune build, comparable blast radius — one new module + CLI wiring + tests) cost ~$19.73/33 msgs in this repo per the 2026-07-02 aggregate cost report; this FEAT's added surface (git-worktree cross-reference + dirty/unmerged safety check + default-flip) is smaller than that original build, so effort_estimate 0.5 (mid dimension-table band, single-module extension, no schema change) maps to a 5-point Fibonacci band — below the 8-point gate, no forced decomposition. Per the operator's explicit framing: technical_risk is weighted on the destructive-operation surface (git worktree remove --force / branch -D / rm -rf against a real repo) rather than on pattern novelty alone, since deleting a worktree with uncommitted or unmerged work is NOT git-revertable — landing this closer to the 0.6-0.8/0.9-1.0 boundary than a typical single-module change would otherwise score.

## Scores

- customer_impact: 0.40
- effort_estimate: 0.50
- strategic_alignment: 0.40
- technical_risk: 0.70
- dependency_depth: 0.15

## Priority Derivation

composite_priority: P2
autonomous_safe: false
reasoning: P2: moderate customer_impact (disk/confusion hygiene, not blocking) and moderate strategic_alignment (ops tooling, not mission-differentiating) are offset upward by elevated technical_risk (0.7, weighted per the destructive/hard-to-reverse-effects criterion rather than pattern novelty) which argues for careful, non-autonomous rollout rather than urgency — landing at P2 with autonomous_safe=false.

## Risks

- Two weeks later this could fail validation because the 'clean' check for an orphan worktree only ran `git status --porcelain` on the worktree's working directory, but the worktree directory itself may already be partially gone/moved externally — the guard needs to ALSO verify the branch has no unmerged commits relative to main (`git log <branch> --not main`, or equivalent) independent of the working-tree-dirty check; a worktree can be working-tree-clean yet still hold unpushed, unmerged commits on its branch.
- Rollback if a --prune run removes real uncommitted or unmerged work: there is no git-revert path for deleted uncommitted changes — this is the core reason dry-run-by-default and a mandatory 'needs manual handling' report path (rather than best-effort skip-and-continue) are non-negotiable in the ACs below, not just a safety nicety.
- Existing coverage gap: src/tests/dispatch-prune.test.mts exercises the runId-tracked teardown path against synthetic fixtures; it does not yet cover the new git-worktree-list cross-reference path, nor a fixture worktree with real staged-but-uncommitted changes — AC-4 below requires a dedicated regression test asserting the reaper refuses to remove such a worktree.
