---
id: SLICE-136
title: Astrarunner envelope enrichment — costUsd + tokens + dispatchKind + iterationIndex
status: completed
feature: FEAT-203
phase: null
priority: P2
target_release: null
requires_validation: false
requires_validation_reason: Additive optional envelope fields; library-internal behavior covered by unit tests + envelope-shape assertions.
risk: low
created: 2026-07-01
updated: 2026-07-01
effort_points: 5
touches_files: [schemas/loop-events/agent-dispatch.schema.json, src/scripts/lib/slice-linker/agent-report-writer.mts, src/scripts/lib/slice-linker/astrarunner-ingest.mts, src/scripts/lib/auto-dispatch.mts, src/scripts/lib/cost-rate-table.mts, src/tests/envelope-enrichment.test.mts]
completed_at: 2026-07-01
---
# SLICE-136: Astrarunner envelope enrichment — costUsd + tokens + dispatchKind + iterationIndex

Implements FEAT-203 (bundles GH #293 iterationIndex, #294 dispatchKind, #295 costUsd + tokens). See [feature file](../../../backlog/triaged/FEAT-203.md).

## Objective

Enrich `slice.agent_completed` envelope + `agent-dispatch.schema.json` with per-agent cost, token counts (input/output + cache read/write), orchestration path (dispatchKind), retry counter (iterationIndex), and pass-through of hook-native `agentId`. All fields additive-optional; back-compat unchanged.

## In scope

- Extend `parseTranscript()` (`src/scripts/lib/slice-linker/agent-report-writer.mts:194-228`) to accumulate `message.usage.{input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens}` across assistant messages. Return them alongside existing `{turns, model, tools, skills}`.
- New module `src/scripts/lib/cost-rate-table.mts` exporting `deriveCostUsd({model, inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens}, ratesOverride?)`. Hardcoded fallback for Sonnet 4.6, Opus 4.7, Haiku 4.5. Config override via `loop.costRates` in `.claude/loop.json`. Unknown model → 0 (fail-safe).
- Extend `AgentRow` (`astrarunner-ingest.mts:24-41`) with `agentId?, cacheReadInputTokens?, cacheCreationInputTokens?, costUsd?, dispatchKind?, iterationIndex?`.
- Extend `buildEnvelope()` (`astrarunner-ingest.mts:56-85`) to emit new payload fields. Bump `schemaVersion: "v1" → "v1.1"`.
- Extend `DispatchOpts` (`auto-dispatch.mts:12-25`) with `dispatchKind?: "auto"|"manual"|"wave"|"hierarchical"` + `iterationIndex?: number`. Thread into `buildAuditEntry()` at `auto-dispatch.mts:124-138`.
- Extend `writeAgentReport()` in `agent-report-writer.mts:481` to compute costUsd + populate agentId per row before `postAgentCompletions()` call.
- Extend `schemas/loop-events/agent-dispatch.schema.json` — add `agentId, cacheReadInputTokens, cacheCreationInputTokens, dispatchKind, iterationIndex` to `properties`. `required` unchanged.
- New test file `src/tests/envelope-enrichment.test.mts` covering AC-1 through AC-6.

## Out of scope

- Astrarunner FE / BE changes (separate repo).
- `parentAgentRunId` — dropped (no `parent_agent_id` in hook payload).
- `agentRunId` as client-supplied primary key — dropped (Astrarunner assigns pk).
- Threading `dispatchKind` at ALL call sites — this slice adds the field surface; call sites can start populating in follow-up. Default `null` accepted.
- Threading `iterationIndex` at ALL retry sites — same rationale. Default `0`.
- Backfilling historical agent-report artifacts.

## Acceptance criteria

- [ ] AC-1: `parseTranscript(path)` returns `{turns, model, tools, skills, inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens}`. Token fields are the sum of `message.usage.{input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens}` across all assistant messages. Missing `usage` block or absent field → treated as 0. Empty transcript → all token totals = 0.
- [ ] AC-2: `deriveCostUsd(usage, override?)` in `src/scripts/lib/cost-rate-table.mts` returns `inputTokens*inputRate + outputTokens*outputRate + cacheReadInputTokens*cacheReadRate + cacheCreationInputTokens*cacheCreationRate`. Rate table lookup: `override[model]` → config `loop.costRates[model]` → hardcoded fallback for `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`. Unknown model returns `0` (no throw). Rates use per-MTok pricing (divide token counts by 1_000_000 in cost calc).
- [ ] AC-3: `buildEnvelope(opts, row)` in `astrarunner-ingest.mts` emits payload containing `agentId, costUsd, inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens, dispatchKind, iterationIndex` alongside existing fields. Envelope-level `schemaVersion: "v1.1"`. Absent inputs default: `agentId: null`, `dispatchKind: null`, `iterationIndex: 0`, all cost/token fields: `null` when row lacks them.
- [ ] AC-4: `DispatchOpts` in `auto-dispatch.mts` accepts optional `dispatchKind` (enum `"auto"|"manual"|"wave"|"hierarchical"`) + `iterationIndex` (number >= 0). Passed values are written to `buildAuditEntry()` output. Negative `iterationIndex` clamps to 0 with `console.warn`. `dispatchKind` outside enum coerces to `null` with `console.warn`.
- [ ] AC-5: `schemas/loop-events/agent-dispatch.schema.json` `properties` gains `agentId (type: [string, null])`, `cacheReadInputTokens (integer, min 0)`, `cacheCreationInputTokens (integer, min 0)`, `dispatchKind (type: [string, null], enum: [auto, manual, wave, hierarchical, null])`, `iterationIndex (integer, min 0)`. `required` array unchanged. Schema still validates via `ajv` if present; otherwise smoke-test via JSON.parse.
- [ ] AC-6: `src/tests/envelope-enrichment.test.mts` contains >= 6 tests covering: (a) `parseTranscript` accumulates all 4 token fields across a 3-assistant-message fixture; (b) `deriveCostUsd` computes correctly for Sonnet 4.6; (c) `deriveCostUsd` returns 0 for unknown model; (d) `deriveCostUsd` honors config override via loop.json fixture; (e) `dispatchAgent` audit-log line contains `dispatchKind` + `iterationIndex` when set; (f) `buildEnvelope` payload emits all new fields with correct defaults for missing inputs. All pass.
- [ ] AC-7: `bun test src/tests/ --parallel --timeout 60000` fully green (no regressions). `bunx eslint src eslint.config.mjs` zero new warnings. `bunx tsc --project tsconfig.json --noEmit` clean. `bunx tsc --project tsconfig.test.json --noEmit` clean.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- Crew `final-synthesis` artifact written
- FEAT-203 moved from `triaged/` to `done/` (single-slice FEAT)

## Reviewer ladder

- Reviewer A: correctness — token accumulation edge cases (missing usage block, cache-field absence on older transcripts), cost math precision (per-MTok division), schema shape compat with existing ingest consumers.
- Reviewer B: production-readiness — no regressions in existing `slice.agent_completed` consumers, config override precedence documented, back-compat verified (payload emitted without new fields still consumable), observability (warn on unknown model / clamp events).
