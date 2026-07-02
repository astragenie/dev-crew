---
id: SLICE-138
title: Dispatch prune reaper + snapshot.dispatchTree observability (bundled SLICE-1+SLICE-2)
status: completed
feature: FEAT-205
phase: null
priority: P3
target_release: null
requires_validation: false
requires_validation_reason: "Additive subcommand + snapshot fields + advisory badge. Library-internal, covered by unit tests. Destructive git ops gated behind explicit invocation."
risk: medium
created: 2026-07-01
updated: 2026-07-02
effort_points: 5
touches_files: [src/scripts/lib/dispatch-config.mts, src/scripts/lib/dispatch-prune.mts, src/scripts/lib/dispatch-tree-snapshot.mts, src/scripts/lib/loop-snapshot.mts, src/scripts/lib/marathon-checkpoint.mts, src/scripts/loop.mts, src/tests/dispatch-prune.test.mts, src/tests/dispatch-tree-snapshot.test.mts]
completed_at: 2026-07-02
---
# SLICE-138: Dispatch prune reaper + snapshot.dispatchTree observability

Implements FEAT-205 (bundles SLICE-1 reaper + SLICE-2 observability — same surface). See [feature file](../../../backlog/triaged/FEAT-205.md).

## Objective

Wire the dead `loop.dispatch.pruneStaleAfterDays` config knob to an actual reaper + expose `snapshot.dispatchTree.{openRunIds, worktreeCount, oldestRunAgeDays}` telemetry + emit advisory `dispatch-worktree-accretion` badge at 2× threshold. Closes ops risk of unbounded worktree accretion under marathon+wave workloads (evidence: 22 orphan worktrees / ~5GB / 5 lost handoffs over 24h from FEAT-202 triage).

## In scope

- New module `src/scripts/lib/dispatch-prune.mts`:
  - `listStaleRunIds(repoRoot, olderThanDays): Promise<Array<{runId, ageDays, worktreeCount, branchCount}>>` — scans `.claude/artifacts/loop/dispatch/<runId>/` dirs, filters by age.
  - `pruneRunId(repoRoot, runId): Promise<{worktreesRemoved, branchesRemoved, dirRemoved, errors}>` — per-runId destructive teardown.
  - `pruneStale(repoRoot, opts): Promise<{listed, pruned, failed, errors}>` — orchestrator.
- New module `src/scripts/lib/dispatch-tree-snapshot.mts`:
  - `readDispatchTreeSnapshot(repoRoot): Promise<{openRunIds, worktreeCount, oldestRunAgeDays}>` — enumerate runId dirs, distinguish open (missing summary.md OR trace.jsonl has in-flight children within 5min of now) vs closed.
- Extend `src/scripts/lib/loop-snapshot.mts` to include the `dispatchTree` block in snapshot output + render `## Dispatch lifecycle` section in `loop-snapshot.md` when `openRunIds.length > 0 || worktreeCount > 0`.
- Extend `src/scripts/lib/marathon-checkpoint.mts` (or wherever `checkMarathonCheckpoint` lives) to emit `dispatch-worktree-accretion` advisory badge when `oldestRunAgeDays > pruneStaleAfterDays * 2`. Non-blocking.
- New CLI subcommand `bun src/scripts/loop.mts dispatch prune [--dry-run] [--older-than-days N] [--repo <path>]` wired in `src/scripts/loop.mts`. Prints report table, exits 0 on success, 1 if any pruning failed.
- Optional startup hook: read `loop.dispatch.autoPruneOnStart` (default `false`) — if true, `/runner:auto` walker invokes `pruneStale` before entering loop. New config field added to `dispatch-config.mts` schema.
- Tests in `src/tests/dispatch-prune.test.mts` (≥ 5 cases) + `src/tests/dispatch-tree-snapshot.test.mts` (≥ 3 cases).

## Out of scope

- Runtime worktree path re-nesting (`<runId>/<childId>` layout) — YAGNI per architect review.
- `git worktree prune` built-in cleanup (git handles).
- Cross-repo GC.

## Acceptance criteria

- [ ] AC-1: `bun src/scripts/loop.mts dispatch prune [--dry-run] [--older-than-days N] [--repo <path>]` implemented. `--dry-run` lists stale runIds without touching disk (columns: runId, ageDays, worktreeCount, branchCount) and exits 0. Real mode: for each stale runId, invokes `pruneRunId()` (git worktree remove --force per worktree, git branch -D per branch, rm -rf `<runId>/`); logs per-runId success/failure to stderr; exits 0 if all succeed, 1 if any failed. `--older-than-days` overrides config default; absent uses `loop.dispatch.pruneStaleAfterDays` (default 7).
- [ ] AC-2: `loop.dispatch.autoPruneOnStart` config field accepted by `dispatch-config.mts::readDispatchConfig` (boolean, default false). When true, `/runner:auto` walker startup invokes `pruneStale({olderThanDays: config.pruneStaleAfterDays, dryRun: false})` before entering the walker loop. Failure logs to stderr; walker continues (non-blocking).
- [ ] AC-3: `readDispatchTreeSnapshot(repoRoot)` in `src/scripts/lib/dispatch-tree-snapshot.mts` returns `{openRunIds: string[], worktreeCount: number, oldestRunAgeDays: number | null}`. `openRunIds` = runId dirs where `summary.md` is missing OR `trace.jsonl` was modified within the last 5 minutes (in-flight guard). `worktreeCount` = sum of `git worktree list` entries pointing under `<repoRoot>-<childId>-<depth>` for each open runId. `oldestRunAgeDays` = age in days of oldest runId dir (any state), null if directory missing/empty.
- [ ] AC-4: `loop-snapshot.mts` includes `dispatchTree` block in the snapshot output object. When `dispatchTree.openRunIds.length > 0 || dispatchTree.worktreeCount > 0`, the rendered `loop-snapshot.md` includes a `## Dispatch lifecycle` section listing openRunIds, worktreeCount, oldestRunAgeDays. When `oldestRunAgeDays > pruneStaleAfterDays`, appends hint: "run `bun src/scripts/loop.mts dispatch prune` to reap".
- [ ] AC-5: `checkMarathonCheckpoint` (or the module that owns marathon-checkpoint badge emission) evaluates `snapshot.dispatchTree.oldestRunAgeDays > pruneStaleAfterDays * 2` and emits advisory badge `dispatch-worktree-accretion` in the snapshot object at level `advisory` (non-blocking; walker continues). Badge cleared when condition no longer holds.
- [ ] AC-6: Tests in `src/tests/dispatch-prune.test.mts` cover ≥ 5 cases: (a) `--dry-run` on 3-runId fixture with 1 stale returns 1 entry, no disk mutation; (b) real prune removes runId dir + reports 1 pruned; (c) `pruneRunId` failure on one runId continues to next, exit 1; (d) `pruneStale` with no `.claude/artifacts/loop/dispatch/` dir returns empty; (e) in-flight guard skips runId whose `trace.jsonl` was modified <5min ago. `src/tests/dispatch-tree-snapshot.test.mts` covers ≥ 3 cases: (a) empty dispatch dir returns zeroes/null; (b) mixed open/closed runIds populate `openRunIds` correctly; (c) `dispatch-worktree-accretion` badge emits at 2× threshold, not at 1× or below.
- [ ] AC-7: Full-suite green. `bun test src/tests/ --parallel --timeout 60000` no regressions on baseline 1856 pass. `bunx eslint src` zero new warnings. `bunx tsc --project tsconfig.json --noEmit` clean. `bunx tsc --project tsconfig.test.json --noEmit` clean.

## Done When

- all ACs PASS
- FEAT-205 moves to `done/`
- Crew `final-synthesis` written
- Manual smoke: `bun src/scripts/loop.mts dispatch prune --dry-run` runs against real repo `.claude/artifacts/loop/dispatch/` (currently contains many runIds from this session) and lists candidates without mutating disk.

## Reviewer ladder

- Reviewer A: correctness — in-flight guard timing (5min window OK for wave-mode?), age calc uses runId dir mtime vs oldest file inside, worktree count matches `git worktree list` output for the runId, dry-run really doesn't mutate disk (grep new code for destructive ops behind `dryRun` conditional).
- Reviewer B: production-readiness — Windows handle-leak resilience (continue-on-failure), no perf regression on snapshot writer (I/O over dispatch dir with ≥100 runIds should complete <500ms), badge advisory-level correctness (does NOT block walker), autoPruneOnStart failure isolation (walker never crashes if reaper throws).
