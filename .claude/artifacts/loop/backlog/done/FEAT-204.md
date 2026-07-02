---
id: FEAT-204
status: done
priority: P2
category: observability
target_release: null
created: 2026-07-01
updated: 2026-07-02
triaged_at: 2026-07-01
depends_on: [FEAT-203]
slices: [SLICE-137]
derived_from: null
autonomous_safe: true
tags: [observability, envelope, astrarunner-ingest, dispatch-kind]
pm_customer_impact: 0.55
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.7
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
composite_score: 0.62
ac_clarity_status: passed
needs_ac_rewrite: false
needs_contract: false
needs_ux: false
triage_notes: |
proposed_slices:
  - id_suffix: -SLICE-1
    title: Thread dispatchKind + iterationIndex from audit-log into slice.agent_completed envelope
    points: 5
started_at: 2026-07-02
slices_complete: [SLICE-137]
completed_at: 2026-07-02
---
# FEAT-204: Thread dispatchKind + iterationIndex into slice.agent_completed envelope

## Source

Follow-up to FEAT-203 (SLICE-136) which landed envelope v1.1 field surface but left `dispatchKind` and `iterationIndex` at null/0 defaults because no call site populates them. This ships the actual threading so Astrarunner UI can render real values.

## Description

Extend `writeAgentReport()` in `agent-report-writer.mts` to read the auto-dispatch audit log (`.claude/artifacts/loop/auto-dispatch.jsonl`), join entries to per-agent hook-event pairs by `(sliceId, agent, timestamp-window)`, and thread the matching `dispatchKind + iterationIndex` onto each `AgentRow` before `postAgentCompletions()`.

Also: add `sliceId` field to the audit-log entry itself (currently written to `slice-events.jsonl` but not to `auto-dispatch.jsonl`), so the join is a simple filter, not a fuzzy match.

Populate `dispatchKind` at emit sites (CLI orchestration):
- `/runner:auto` walker → `"auto"`
- `/runner:wave` planner + wave children → `"wave"`
- `runner:hierarchical-dispatcher` fan-out → `"hierarchical"`
- All other paths → `"manual"` (default)

Populate `iterationIndex` at retry-decision sites:
- Retry-after-review-fail (crew:ship / crew:fix flows) → increment from prior audit entry for same `(sliceId, agent)`.
- All other paths → 0 (default).

## Acceptance Criteria

**AC-1 — Audit log entry carries sliceId**
Given: `dispatchAgent(opts)` is called with `opts.sliceId = "SLICE-N"`.
When: the audit-log JSONL line is written to `.claude/artifacts/loop/auto-dispatch.jsonl`.
Then: the JSON object contains `"sliceId": "SLICE-N"`. Absent `opts.sliceId` → `"sliceId": null`. Field ordering unchanged (append after existing fields).

**AC-2 — Join reads audit log during writeAgentReport**
Given: an agent-pair `{agentType, startTs, stopTs}` produced by `pairAgentEvents()` and an audit log entry with matching `agent === agentType` and `sliceId === current-slice` and `timestamp <= startTs`.
When: `writeAgentReport()` runs after transcript enrichment.
Then: the pair gains `dispatchKind` and `iterationIndex` from the closest-preceding audit entry. Multiple candidate entries → pick the one with the largest timestamp still ≤ startTs (nearest-preceding). Consumed entries not re-used by later pairs (LIFO consumption).

**AC-3 — dispatchKind emit sites populated**
Given: the loop CLI orchestrator dispatches a subagent.
When: dispatchAgent is called from `/runner:auto` walker, `/runner:wave` planner, `runner:hierarchical-dispatcher`, or any other path.
Then: `DispatchOpts.dispatchKind` is set to `"auto" | "wave" | "hierarchical" | "manual"` respectively. Missing/unknown → `"manual"` default via helper. Every direct `dispatchAgent()` call site touched.

**AC-4 — iterationIndex increments on retry**
Given: `dispatchAgent()` is called for `(sliceId, agent)` after a prior audit-log entry exists for the same tuple.
When: the caller (crew:ship or crew:fix retry loop) invokes dispatchAgent.
Then: `DispatchOpts.iterationIndex` = 1 + max iterationIndex of prior audit entries for that tuple. First dispatch = 0. Retry sites use helper `computeNextIterationIndex(auditLogPath, sliceId, agent)`.

**AC-5 — Envelope carries real values**
Given: a slice with one CI-successful reviewer dispatch (iter 0) and one retry-after-fail builder dispatch (iter 1) under wave mode.
When: `postAgentCompletions()` posts the `slice.agent_completed` envelopes.
Then: reviewer envelope has `dispatchKind: "wave", iterationIndex: 0`. Builder retry envelope has `dispatchKind: "wave", iterationIndex: 1`. First builder (before retry) has `iterationIndex: 0`.

**AC-6 — Back-compat**
Given: an audit log entry written by an OLD plugin version lacking `sliceId` field.
When: `writeAgentReport` runs against it.
Then: entry is treated as sliceId-mismatch and not joined to any pair. No throw. Test asserts.

**AC-7 — Test coverage**
Given: new tests in `src/tests/audit-log-envelope-join.test.mts`.
When: run via `bun test`.
Then: cover: (a) audit entry sliceId round-trip; (b) join picks nearest-preceding entry; (c) consumed entry not re-used; (d) missing audit entry → dispatchKind stays null (back-compat); (e) computeNextIterationIndex returns 0/1/2 sequence for repeated tuple. All pass, no regressions in existing 1839-test suite.

## Edge Cases

- **No audit log file** — no join happens; all envelopes emit null/0. No throw.
- **Audit log entry with malformed JSON** — skipped silently (existing `readDispatchLog` behavior).
- **Two dispatches within same millisecond** — sort by (timestamp asc, iterationIndex asc); nearest-preceding by timestamp; iterationIndex ties broken by insertion order.
- **Wave-mode multi-process audit logs** — each worktree has its own audit-log path. Skip join for now (out-of-scope for this slice); wave-child dispatch envelopes will still emit `dispatchKind: "wave"` (populated at emit site) but iterationIndex may be inaccurate for cross-process retries. Documented limitation.
- **Reviewer/verifier chained dispatch** — inherits parent's dispatchKind, same sliceId. First reviewer of a slice → iter 0. Retry-after-fix builder → iter 1. Retry-after-fail reviewer → same slice, but agent differs so it's iter 0 for that agent.

## References

- FEAT-203 / SLICE-136 (done) — envelope v1.1 surface
- Astrarunner #504 — decision log for FE/BE consumers
- `src/scripts/lib/auto-dispatch.mts:151-167` — buildAuditEntry (extend with sliceId)
- `src/scripts/lib/slice-linker/agent-report-writer.mts:481-555` — writeAgentReport (add join step)
- `src/scripts/lib/cost-by-skill.mts:52-84` — readDispatchLog (reuse for join input)

## Out of scope (future FEAT if needed)

- Wave-mode cross-process audit-log aggregation.
- Retroactive backfill of old auto-dispatch.jsonl entries with sliceId.
- iterationIndex reset semantics across sessions (currently per-slice, per-agent, cumulative).
