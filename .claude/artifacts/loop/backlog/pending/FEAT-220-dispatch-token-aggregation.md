---
id: FEAT-220
status: pending
priority: null
category: platform
target_release: null
created: 2026-07-05
depends_on: []
slices: []
derived_from: null
tags: [concern:telemetry, concern:dispatch, surface:cli, stack:typescript]
autonomous_safe: false
triage_notes: "Architect-scoped 2026-07-05. Replace hardcoded 0-token placeholders in hierarchical-dispatch finalize with real token/cost aggregation. autonomous_safe=false — touches a tested, depended-upon module (agent-report-writer) and commits to a public schema field whose correlation heuristic needs human review."
---

# FEAT-220: real token/cost aggregation in hierarchical-dispatch finalize

## Problem

`bun src/scripts/dispatch.mts metrics --run-id <id>` always reports zero spend.
`cmdFinalize` (`src/scripts/dispatch.mts:192-203`) hardcodes
`totalTokens/promptTokens/completionTokens/estimatedCostUsd: 0`. The `costUsd`
field on `DispatchResult` (`dispatch-types.mts:22`) was a hook for a producer
that never shipped — `dispatch-prompt.mts:46` still injects
`"costUsd": null // FEAT-165 populates` into every child, but FEAT-165 shipped
something unrelated (skill-bucketing of `auto-dispatch.jsonl`). An LLM subagent
cannot introspect its own harness token usage, so children always report null.

## Evidence (architect, read-only)

- `dispatch.mts:192-203` — hardcoded zeros; `model` never derived from children.
- `dispatch-aggregate.mts:4-33` — passes child `costUsd` straight through (null).
- **Only real token-counting**: `slice-linker/agent-report-writer.mts` —
  `readEventsInWindow` (`.claude/logs/events.jsonl`, `subagent_start/stop`),
  `pairAgentEvents`/`dedupePairsByTranscript`, `parseTranscript` (sums
  `usage.input_tokens`/`output_tokens`), `cost-rate-table.mts::deriveCostUsd`.
  Scoped to **(sliceId, time window)**, NOT a dispatch runId; and the computed
  numbers are **never persisted locally** (only POSTed via `postAgentCompletions`).
- `dispatch-metrics.json` has **no downstream reader** but `cmdMetrics` — a dead
  end today; snapshot cost trajectory sources from `cost-report-dedup.mts`.

## Decision — Option A (loop-owned heuristic)

Ship real aggregation using a time-window + agentType/start-order correlation,
reusing the proven agent-report token pipeline. Be honest about ambiguity: when
2+ children share an agentType (concurrent), surface them in `partialChildren`
rather than emitting a confidently-wrong sum. Do NOT wire `dispatch-metrics.json`
into the loop-snapshot cost rollup (double-count risk vs the slice cost pipeline).
Option B (upstream crew hook embedding runId/childId in subagent events —
unambiguous) is filed as a follow-up upstream-request; Option C (0→null punt)
rejected.

## Slices

- **SLICE-A (producer):** extract `transcript-token-usage.mts` out of
  `agent-report-writer.mts` (behavior-preserving; existing
  `agent-report-writer.test.mts` must pass unchanged; brings that file back under
  the ~400-line cap, currently 649). Build `dispatch-cost-aggregate.mts` on top,
  scoped to a dispatch run's window, with `partialChildren` for missing/ambiguous
  correlation. Fixture tests incl. an explicit same-agentType-concurrency case.
- **SLICE-B (consumer):** `cmdFinalize` calls the aggregator; `DispatchMetrics`
  gains `partialChildren: string[]`; `status: "partial"` when non-empty; fix the
  stale "FEAT-165 populates" / "Library does not compute cost" doc language.

## Acceptance criteria

- [ ] `agent-report-writer.test.mts` passes unchanged after extraction; the file
  is at/under ~400 lines.
- [ ] N children of distinct agentTypes → non-zero totals matching a synthetic
  fixture sum.
- [ ] 2+ same-agentType children → `partialChildren` names the ambiguous ones,
  not a guessed sum.
- [ ] No matched events (missing `events.jsonl`) → valid zeros + `partialChildren`
  covering every child; `cmdFinalize` never throws.
- [ ] `dispatch.mts metrics --run-id <id>` prints `partialChildren` when non-empty.
- [ ] Stale design-doc language updated to point at this FEAT.

## Risks

- Double-counting vs slice-level cost reports over the same `events.jsonl` — keep
  `dispatch-metrics.json` out of any repo-wide rollup (true today; documented as
  an attribution view).
- Cross-worktree attribution: `.claude/logs/` is per-worktree + gitignored; one
  historical `events.jsonl` sample showed `repoPath` = main repo — **re-verify
  with a live multi-child dispatch smoke before grading SLICE-A**.
- Same-agentType concurrency correlation is a heuristic — mitigated via
  `partialChildren`; unambiguous fix needs Option B (upstream).
- `events.jsonl` unbounded — reuse the existing streaming (`readline`) pattern.

## Refs

- Full architect analysis: agent transcript 2026-07-05 (file:line cited above).
- `docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md:86,201,346`
  (original cost deferral), `.claude/artifacts/loop/backlog/done/FEAT-165.md`.
