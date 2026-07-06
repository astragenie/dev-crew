---
id: FEAT-220
status: done
priority: P2
category: platform
target_release: null
created: 2026-07-05
updated: 2026-07-06
depends_on: []
slices: [SLICE-141, SLICE-142]
derived_from: null
tags: [concern:telemetry, concern:dispatch, surface:cli, stack:typescript]
pm_customer_impact: 0.3
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.5
pm_technical_risk: 0.6
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-05
autonomous_safe: true
triage_notes: "Architect-scoped 2026-07-05. Replace hardcoded 0-token placeholders in hierarchical-dispatch finalize with real token/cost aggregation. PM triage 2026-07-05: architect set autonomous_safe=false (correlation heuristic + public-schema-field commit needs human review); PM confirms the underlying risk is real (technical_risk=0.6 — cross-module reach into the tested, depended-upon agent-report-writer.mts plus a new DispatchMetrics.partialChildren/status:\"partial\" field) but flips autonomous_safe to true because this work is being executed via a manual worktree + PR flow, and that PR IS the human review the architect asked for — the concern is satisfied by the execution path, not waived. Rollback stays revert-only: dispatch-metrics.json has no downstream reader today (per architect evidence) and is explicitly kept out of the loop-snapshot cost rollup, so no migration or cross-plugin coordination is needed if this needs to be undone. Formula cross-check (pm-scorer.mts::computeAutonomousSafe): technical_risk=0.6 is not >0.6, effort_estimate=0.5 is not >0.6, dependency_depth=0.1 is not >0.6, and explicit Given-When-Then ACs now exist below — all three numeric gates plus the AC-presence gate clear."
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

- **SLICE-141 / SLICE-A (producer):** extract `transcript-token-usage.mts` out of
  `agent-report-writer.mts` (behavior-preserving; existing
  `agent-report-writer.test.mts` must pass unchanged; brings that file back under
  the ~400-line cap, currently 649). Build `dispatch-cost-aggregate.mts` on top,
  scoped to a dispatch run's window, with `partialChildren` for missing/ambiguous
  correlation. Fixture tests incl. an explicit same-agentType-concurrency case.
- **SLICE-142 / SLICE-B (consumer):** `cmdFinalize` calls the aggregator; `DispatchMetrics`
  gains `partialChildren: string[]`; `status: "partial"` when non-empty; fix the
  stale "FEAT-165 populates" / "Library does not compute cost" doc language.

## Acceptance criteria

- **AC-1:** Given the pre-extraction `agent-report-writer.mts` at 649 lines and its
  existing `agent-report-writer.test.mts` suite, When `transcript-token-usage.mts`
  is extracted out of it (behavior-preserving), Then `agent-report-writer.test.mts`
  passes unchanged with zero modified assertions and `agent-report-writer.mts` is
  at/under the ~400-line cap.
- **AC-2:** Given a synthetic dispatch-run fixture with N children of distinct
  `agentType` values within `dispatch-cost-aggregate.mts`'s (dispatch runId, time
  window) correlation scope, When the aggregator runs against that fixture, Then
  `DispatchMetrics.totalTokens`/`promptTokens`/`completionTokens`/`estimatedCostUsd`
  match the fixture's hand-computed sum exactly and `partialChildren` is empty.
- **AC-3:** Given a dispatch-run fixture where 2+ children share the same
  `agentType` (concurrent), When the aggregator cannot unambiguously correlate
  transcripts to those specific children, Then `DispatchMetrics.partialChildren`
  names every ambiguous child id instead of emitting a guessed or silently-merged
  cost/token sum for them.
- **AC-4:** Given a dispatch run whose `.claude/logs/events.jsonl` is missing, or
  contains no matching `subagent_start`/`subagent_stop` events for any child, When
  `cmdFinalize` invokes the aggregator, Then it returns valid zeros for every
  numeric field, `partialChildren` lists every child id, and `cmdFinalize` never
  throws.
- **AC-5:** Given a `DispatchMetrics` result whose `partialChildren` array is
  non-empty and `status` is `"partial"`, When a user runs
  `bun src/scripts/dispatch.mts metrics --run-id <id>`, Then the CLI output prints
  the `partialChildren` list and the `"partial"` status.
- **AC-6:** Given the stale doc language `"costUsd": null  // FEAT-165 populates`
  in `dispatch-prompt.mts:46` (and any sibling doc claiming "FEAT-165 populates" /
  "Library does not compute cost"), When SLICE-142/SLICE-B ships, Then that
  language is updated to reference FEAT-220 so no doc points at a FEAT that
  shipped something unrelated.

## Risks

- Double-counting vs slice-level cost reports over the same `events.jsonl` — keep
  `dispatch-metrics.json` out of any repo-wide rollup (true today; documented as
  an attribution view).
- Cross-worktree attribution: `.claude/logs/` is per-worktree + gitignored; one
  historical `events.jsonl` sample showed `repoPath` = main repo — **re-verify
  with a live multi-child dispatch smoke before grading SLICE-141/SLICE-A**.
- Same-agentType concurrency correlation is a heuristic — mitigated via
  `partialChildren`; unambiguous fix needs Option B (upstream).
- `events.jsonl` unbounded — reuse the existing streaming (`readline`) pattern.
- **Pre-mortem (technical_risk=0.6, PM-mandatory per `agents/pm.md`):**
  1. *Most likely two-weeks-later failure cause:* the same-agentType concurrency
     heuristic misattributes tokens against a real production `events.jsonl`
     shape the synthetic fixtures didn't anticipate — the FEAT's own Risks
     section already flags this as unresolved ("re-verify with a live
     multi-child dispatch smoke before grading SLICE-A").
  2. *Rollback if this merges and breaks the loop:* revert-only. Per architect
     evidence, `dispatch-metrics.json` has no downstream reader and is
     explicitly excluded from the loop-snapshot cost rollup, so `git revert` of
     SLICE-141 + SLICE-142 restores the hardcoded-zero behavior with no
     migration and no cross-plugin coordination.
  3. *Coverage gap existing tests would miss:* `agent-report-writer.test.mts`
     covers the extracted token-parsing logic but has no assertions on the new
     dispatch-runId-scoped correlation window in `dispatch-cost-aggregate.mts` —
     an off-by-one at a time-window boundary or a wrong child-to-transcript
     match would pass the old suite untouched. AC-2/AC-3's new fixture tests are
     what must close this gap; a reviewer should confirm they exist before PASS.

## Refs

- Full architect analysis: agent transcript 2026-07-05 (file:line cited above).
- `docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md:86,201,346`
  (original cost deferral), `.claude/artifacts/loop/backlog/done/FEAT-165.md`.
