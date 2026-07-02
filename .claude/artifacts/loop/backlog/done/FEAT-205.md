---
id: FEAT-205
status: in-progress
priority: P3
category: tech-debt
target_release: null
created: 2026-07-01
updated: 2026-07-02
triaged_at: 2026-07-01
depends_on: []
slices: [SLICE-138, SLICE-139]
derived_from: FEAT-020
autonomous_safe: true
tags: [dispatch, worktree, observability, cleanup, gc]
pm_customer_impact: 0.35
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.55
pm_technical_risk: 0.25
pm_dependency_depth: 0.1
composite_score: 0.55
ac_clarity_status: passed
needs_ac_rewrite: false
needs_contract: false
needs_ux: false
triage_notes: |
proposed_slices:
  - id_suffix: -SLICE-1
    title: Wire pruneStaleAfterDays reaper — dispatch prune subcommand + startup hook
    points: 2
  - id_suffix: -SLICE-2
    title: "Surface snapshot.dispatchTree observability (openRunIds, worktreeCount, oldestRunAgeDays)"
    points: 2
started_at: 2026-07-02
slices_complete: [SLICE-138]
---
# FEAT-205: Dispatch lifecycle GC + snapshot.dispatchTree observability

## Source

Follow-up to FEAT-020 close-out. Architect-reviewer identified 2 real ops risks in the shipped hierarchical dispatch surface — both additive observability/reaper work, no architectural changes.

## Description

Two dead-config knobs and one missing observability surface. Fixing them closes the lifecycle-GC gap that FEAT-202 SLICE-134/135 uncovered (22 orphan worktrees / ~5GB accretion over 24h under marathon+wave workload).

### Risk 1 — dead reaper config

`dispatch-config.mts:37-40` accepts `loop.dispatch.pruneStaleAfterDays: 7` from `.claude/loop.json` but no consumer implements the reap logic. Operators reading the config schema believe stale worktrees auto-clean after 7 days; they don't. Under marathon-mode + wave-dispatch, worktrees accrete unboundedly.

### Risk 2 — no telemetry surface

`snapshot.dispatchTree` doesn't exist. Marathon walker can't detect worktree pressure (openRunIds count, oldest-run age, total worktree count on disk) until disk fills. Existing `marathonCheckpointEvery` telemetry only counts slice closes, not dispatch state.

## Acceptance Criteria

**AC-1 — `dispatch prune` subcommand**
Given: `.claude/loop.json` has `loop.dispatch.pruneStaleAfterDays: 7` (default) or explicit override.
When: operator runs `bun src/scripts/loop.mts dispatch prune [--dry-run] [--older-than-days N]` (or `bun src/scripts/dispatch.mts prune ...` if new CLI is added).
Then: command lists `.claude/artifacts/loop/dispatch/<runId>/` directories older than N days (default from config), reports for each: `runId`, age-in-days, worktree count, branch count. In `--dry-run` mode: report only, exit 0. In real mode: for each stale runId, run `git worktree remove --force <path>` per worktree, `git branch -D <branch>` per branch, `rm -rf .claude/artifacts/loop/dispatch/<runId>/` per runId. On any failure, log to stderr and continue; exit 0 if all succeed, exit 1 if any failed.

**AC-2 — Reaper invoked from `/runner:auto` startup**
Given: `/runner:auto` walker starts a new marathon session.
When: it reads `.claude/loop.json` and finds `loop.dispatch.autoPruneOnStart: true` (new config key, default `false` for opt-in).
Then: it invokes the same reap logic as AC-1 before entering the walker loop. On disable (default), no-op.

**AC-3 — snapshot.dispatchTree.openRunIds populated**
Given: `.claude/artifacts/loop/dispatch/` contains N runId directories, each with a `trace.jsonl` file.
When: the loop snapshot writer runs (via `/loop:snapshot-memory` or auto-run).
Then: `snapshot.dispatchTree.openRunIds` is set to a list of runIds whose `trace.jsonl` shows any child with `status: "in-flight"` OR whose `<runId>/summary.md` is missing (i.e. run never finalized). `snapshot.dispatchTree.worktreeCount` = sum of worktrees across open runIds. `snapshot.dispatchTree.oldestRunAgeDays` = age of oldest run directory in days.

**AC-4 — snapshot.md renders dispatch section**
Given: `snapshot.dispatchTree` has ≥ 1 openRunIds OR worktreeCount > 0.
When: `.claude/artifacts/loop/loop-snapshot.md` regenerates.
Then: it includes a `## Dispatch lifecycle` section listing openRunIds, worktreeCount, oldestRunAgeDays, and a hint if `oldestRunAgeDays > pruneStaleAfterDays`: "run `bun src/scripts/loop.mts dispatch prune` to reap".

**AC-5 — Marathon checkpoint pressure integration**
Given: `snapshot.dispatchTree.oldestRunAgeDays > pruneStaleAfterDays * 2`.
When: `checkMarathonCheckpoint` runs.
Then: emits new advisory badge `dispatch-worktree-accretion` (does NOT block; walker continues). Badge cleared on next reap or when oldestRunAge drops below threshold.

**AC-6 — Tests**
Given: new tests in `src/tests/dispatch-prune.test.mts` and extended `src/tests/loop-snapshot.test.mts`.
When: run via `bun test`.
Then: cover: (a) `dispatch prune --dry-run` lists stale runIds without touching disk; (b) real prune removes worktrees + branches + runId dir; (c) reap failure on one runId continues to next; (d) snapshot.dispatchTree populated correctly from mixed open/closed runId set; (e) `dispatch-worktree-accretion` badge emitted at 2× threshold. All pass, no regressions.

**AC-7 — Full-suite green**
Given: full test suite.
When: run.
Then: `bun test src/tests/ --parallel --timeout 60000` fully green. `bunx eslint src` zero new warnings. `bunx tsc --project tsconfig.json --noEmit` clean.

## Edge Cases

- **Windows handle-leak on prune** — `git worktree remove --force` may fail if VS Code TS server or Tailwind oxide.node holds a handle. Report failure per-worktree, continue to next; exit 1 if any failed. Operator can retry.
- **Concurrent prune + running dispatch** — refuse to reap a runId whose `summary.md` is missing AND whose `trace.jsonl` was modified within the last 5 minutes (in-flight guard). Report as "skipped: possibly in-flight".
- **No dispatch dir yet** — `.claude/artifacts/loop/dispatch/` missing → both reaper and snapshot report empty; no error.
- **`pruneStaleAfterDays: 0`** — treated as "prune everything on invocation". Documented as an escape hatch for CI. Snapshot still uses `> 0` for pressure signal.

## Out of scope (future FEAT if pain recurs)

- Runtime-worktree-per-runId nesting (`<runId>/<childId>` layout instead of sibling-of-repoRoot). Reviewer flagged as "only worth doing if wave+hierarchical adoption actually causes collision" — YAGNI until measured.
- `git worktree prune` internal cleanup (git's own housekeeping).
- Cross-repo worktree GC (multi-repo workspace).

## References

- FEAT-020 (done as-scoped) — hierarchical dispatch primitive
- FEAT-202 SLICE-134/135 (done) — worktree inventory + cherry-pick surface
- `src/scripts/lib/dispatch-config.mts:37-40` — dead `pruneStaleAfterDays` knob
- `src/scripts/lib/dispatch-worktree.mts:41` — worktree path shape
- `src/scripts/lib/loop-snapshot.mts` — snapshot writer (extend)
- Architect review 2026-07-01 (this session)
