---
id: SLICE-28
status: completed
feature: FEAT-031
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
---
# SLICE-28: FEAT-031 — agent-report-writer hardening + stop-hook diagnosis

Implements FEAT-031. See [feature file](../../../backlog/in-progress/FEAT-031.md) for product context.

## Objective

Agent-report artifacts collapse to `agent_count: 0` when `subagent_stop` events are missing or delayed. 18 of 31 reports affected; most recent four slices (SLICE-24..27) zero. Two-pronged fix: harden the writer to count from `subagent_start` payloads when stops are missing, and diagnose why stops stopped firing after 2026-06-04T14:04Z.

## In scope

- `scripts/lib/slice-linker/agent-report-writer.mjs` + `src/scripts/lib/slice-linker/agent-report-writer.mts`: pair starts without stops; mark them in-flight; count `agent_count` from union of unique `agent_id`s across both event types.
- Unit test covering start-without-stop path (writer emits non-zero `agent_count` with `stopTs: null`).
- Diagnostic notes captured in slice grade / commit message identifying where `subagent_stop` events drop after 14:04Z (config inspection only; no hook code change in this slice).

## Out of scope

- Backfilling historical zero-count reports.
- Refactoring the writer beyond start-fallback counting.
- Fixing the stop-hook itself (separate slice if root cause turns out to be a code regression in hooks).

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and linter clean (`npm run lint`).
- [ ] AC-2: New unit test asserts: when only `subagent_start` events exist (no matching stops), `writeAgentReport` returns `agentCount > 0`, agents array contains entries with `stopTs: null` and `duration_ms: null`.
- [ ] AC-3: Manual re-run of writer on current `events.jsonl` for SLICE-27 produces non-zero `agent_count` (verifies real-data behaviour, not just synthetic test).
- [ ] AC-4: Diagnostic finding for the stop-hook regression captured in slice grade (root cause hypothesis with file/line reference, or explicit "needs separate slice" verdict with reason).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-031 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: code correctness — does the start-fallback pairing preserve existing pair semantics when stops ARE present? Any duplicate counting?
- Reviewer B: test sufficiency — does the new unit test exercise the actual code path that handles missing stops, not a mock that bypasses it?
