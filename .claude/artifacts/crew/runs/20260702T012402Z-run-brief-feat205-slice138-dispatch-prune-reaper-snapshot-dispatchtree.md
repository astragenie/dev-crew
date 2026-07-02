---
feature: FEAT-205
status: active
---
# Run Brief: FEAT205 SLICE138: Dispatch prune reaper + snapshot.dispatchTree observability (bundled SLICE-1+SLICE-2)

- Created: 2026-07-02T01:24:02.146Z
- Tier: full
- Goal: Wire the dead `loop.dispatch.pruneStaleAfterDays` config knob to an actual reaper + expose `snapshot.dispatchTree.{openRunIds, worktreeCount, oldestRunAgeDays}` telemetry + emit advisory `dispatch-worktree-accretion` badge at 2× threshold. Closes ops risk of unbounded worktree accretion under marathon+wave workloads (evidence: 22 orphan worktrees / ~5GB / 5 lost handoffs over 24h from FEAT-202 triage).
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New module `src/scripts/lib/dispatch-prune.mts`:
  - `listStaleRunIds(repoRoot
  - olderThanDays): Promise<Array<{runId
  - ageDays
  - worktreeCount
  - branchCount}>>` — scans `.claude/artifacts/loop/dispatch/<runId>/` dirs
  - filters by age.
  - `pruneRunId(repoRoot
  - runId): Promise<{worktreesRemoved
  - branchesRemoved
  - dirRemoved
  - errors}>` — per-runId destructive teardown.
  - `pruneStale(repoRoot
  - opts): Promise<{listed
  - pruned
  - failed
  - errors}>` — orchestrator.
- New module `src/scripts/lib/dispatch-tree-snapshot.mts`:
  - `readDispatchTreeSnapshot(repoRoot): Promise<{openRunIds
  - worktreeCount
  - oldestRunAgeDays}>` — enumerate runId dirs
  - distinguish open (missing summary.md OR trace.jsonl has in-flight children within 5min of now) vs closed.
- Extend `src/scripts/lib/loop-snapshot.mts` to include
- Out Of Scope:
  - - Runtime worktree path re-nesting (`<runId>/<childId>` layout) — YAGNI per architect review.
- `git worktree prune` built-in cleanup (git handles).
- Cross-repo GC.
- Planned Files: -
- Next Step: Begin implementation

