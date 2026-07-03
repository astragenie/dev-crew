---
id: SLICE-137
title: Thread dispatchKind + iterationIndex from audit-log into slice.agent_completed envelope
status: completed
feature: FEAT-204
phase: null
priority: P2
target_release: null
requires_validation: false
requires_validation_reason: Library-internal audit-log ↔ hook-pair join; covered by unit tests. Additive; no destructive ops.
risk: low
created: 2026-07-01
updated: 2026-07-02
effort_points: 5
touches_files: [src/scripts/lib/auto-dispatch.mts, src/scripts/lib/slice-linker/agent-report-writer.mts, src/scripts/lib/audit-envelope-join.mts, src/scripts/loop.mts, src/scripts/lib/slice-linker/feature-lifecycle.mts, src/tests/audit-log-envelope-join.test.mts]
completed_at: 2026-07-02
---
# SLICE-137: Thread dispatchKind + iterationIndex from audit-log into slice.agent_completed envelope

Implements FEAT-204. See [feature file](../../../backlog/triaged/FEAT-204.md).

## Objective

Populate the `dispatchKind` and `iterationIndex` fields on the `slice.agent_completed` envelope (currently null/0 defaults after FEAT-203/SLICE-136 landed the field surface). Two-part change: (a) `dispatchAgent()` audit-log gains `sliceId` so the join is trivially indexable; (b) `writeAgentReport()` joins audit-log entries to hook-event pairs and threads real values through to `postAgentCompletions()`. Plus: populate `DispatchOpts.dispatchKind` at the ~5 CLI orchestrator call sites and `DispatchOpts.iterationIndex` at retry sites via helper `computeNextIterationIndex()`.

## In scope

- Extend `buildAuditEntry()` in `src/scripts/lib/auto-dispatch.mts:151-167` to include `sliceId: opts.sliceId ?? null`.
- New module `src/scripts/lib/audit-envelope-join.mts` exporting:
  - `joinAuditToPairs(pairs, auditEntries, sliceId): AgentRow[]` — nearest-preceding-timestamp match by `(sliceId, agent === agentType)`, LIFO consumption (each audit entry used at most once). Returns pairs with `dispatchKind` + `iterationIndex` fields set.
  - `computeNextIterationIndex(auditLogPath, sliceId, agent): Promise<number>` — reads audit log via `readDispatchLog()` (from `cost-by-skill.mts`), filters by `(sliceId, agent)`, returns `max(iterationIndex) + 1` or 0 if none.
- Extend `writeAgentReport()` in `src/scripts/lib/slice-linker/agent-report-writer.mts:481-555` to call `joinAuditToPairs()` after `enrichPairsWithTranscripts()` and before `postAgentCompletions()`. Reads audit log via `readDispatchLog()`.
- Populate `DispatchOpts.dispatchKind` at CLI call sites in `src/scripts/loop.mts` and `src/scripts/lib/slice-linker/feature-lifecycle.mts:546`. Values:
  - Walker context (marathon mode / auto-mode) → `"auto"`
  - Wave planner + wave-child dispatches → `"wave"`
  - Hierarchical dispatcher → `"hierarchical"`
  - All other direct dispatches → `"manual"`
- Add `computeNextIterationIndex()` at retry-decision sites (any place `dispatchAgent()` is called for a role that could be re-dispatched — reviewer/verifier/builder). First dispatch = 0; retry = prior + 1.
- 5+ tests in `src/tests/audit-log-envelope-join.test.mts`.

## Out of scope

- Wave-mode cross-process audit-log aggregation (each worktree has its own log file; join across worktrees deferred to future FEAT).
- Backfilling historical `auto-dispatch.jsonl` entries to add `sliceId` field.
- Changing envelope emit ordering (already ships after slice-complete).

## Acceptance criteria

- [ ] AC-1: `buildAuditEntry()` in `auto-dispatch.mts` emits `sliceId: <string | null>` field. Absent opts.sliceId → `null`. Field appended to entry (not reordering existing fields). Verified by reading `.claude/artifacts/loop/auto-dispatch.jsonl` after a dispatch and parsing the last line.
- [ ] AC-2: `joinAuditToPairs(pairs, auditEntries, sliceId)` in new `src/scripts/lib/audit-envelope-join.mts` returns pairs with `dispatchKind` + `iterationIndex` threaded from the nearest-preceding-timestamp audit entry matching `(sliceId, agent === pair.agentType)`. Match rule: `entry.timestamp <= pair.startTs`, largest such timestamp wins. Consumed entries not re-matched to later pairs (LIFO consumption via `used: Set<index>`).
- [ ] AC-3: `computeNextIterationIndex(auditLogPath, sliceId, agent)` reads audit log via existing `readDispatchLog()`, filters by `sliceId` (exact match) AND `agent === agentType`, returns `max(entry.iterationIndex) + 1` across matches. Empty match set → returns 0. Malformed entries skipped. Absent audit log file → returns 0.
- [ ] AC-4: `writeAgentReport()` in `agent-report-writer.mts` calls `joinAuditToPairs()` between `enrichPairsWithTranscripts()` and `postAgentCompletions()`. Reads audit log via `readDispatchLog(resolveAuditLogPath(repoPath))`. Pairs sent to `postAgentCompletions()` carry threaded `dispatchKind` + `iterationIndex` when a match exists; null/0 when no match. Test: given fixture audit + fixture pairs, resulting rows have expected threaded values.
- [ ] AC-5: `DispatchOpts.dispatchKind` populated at each `dispatchAgent()` call site: walker/auto-mode → `"auto"`, wave planner + children → `"wave"`, hierarchical dispatcher → `"hierarchical"`, else → `"manual"`. Verified via grep + assertion: every direct `dispatchAgent(` call in `src/scripts/**/*.mts` passes a non-null `dispatchKind`.
- [ ] AC-6: `computeNextIterationIndex()` used at retry sites. If no such retry site exists in current code (single-shot dispatches only), document this in the slice notes and add the helper as opt-in for future retry loops. Verified by test: three sequential `dispatchAgent()` calls with `iterationIndex = computeNextIterationIndex(...)` produce 0/1/2.
- [ ] AC-7: `src/tests/audit-log-envelope-join.test.mts` contains ≥ 5 tests: (a) audit entry `sliceId` round-trip; (b) `joinAuditToPairs` picks nearest-preceding entry; (c) `joinAuditToPairs` LIFO consumption (consumed entry not re-used); (d) `joinAuditToPairs` back-compat (audit entry without sliceId → no join); (e) `computeNextIterationIndex` returns 0/1/2 sequence for repeated tuple. All pass.
- [ ] AC-8: `bun test src/tests/ --parallel --timeout 60000` fully green (no regressions on 1839 existing tests). `bunx eslint src eslint.config.mjs` zero new warnings. `bunx tsc --project tsconfig.json --noEmit` clean. `bunx tsc --project tsconfig.test.json --noEmit` clean.

## Done When

- all ACs PASS
- FEAT-204 moves to `done/`
- Crew `final-synthesis` artifact written
- Envelope emits real `dispatchKind` + `iterationIndex` for current-session dispatches (verified by inspecting a fresh `slice.agent_completed` envelope in an integration fixture)

## Reviewer ladder

- Reviewer A: correctness — nearest-preceding join semantics under edge cases (ties, same-millisecond entries, missing audit log), LIFO consumption doesn't leak across sliceIds, `computeNextIterationIndex` handles malformed entries.
- Reviewer B: production-readiness — no perf regression on `writeAgentReport` (audit log read is O(entries), typically small; assert < 100ms for 1000-entry fixture), back-compat with v1 audit entries (no sliceId), diagnostic logging when join fails (dispatchKind stays null).
