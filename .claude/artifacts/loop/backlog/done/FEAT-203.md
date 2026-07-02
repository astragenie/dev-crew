---
id: FEAT-203
status: done
priority: P2
category: observability
target_release: null
created: 2026-07-01
updated: 2026-07-01
triaged_at: 2026-07-01
depends_on: []
slices: [SLICE-136]
derived_from: null
autonomous_safe: true
tags: [observability, envelope, astrarunner-ingest]
pm_customer_impact: 0.7
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.75
pm_technical_risk: 0.25
pm_dependency_depth: 0.1
composite_score: 0.71
ac_clarity_status: passed
needs_ac_rewrite: false
needs_contract: false
needs_ux: false
github_issue: 293
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/293"
related_issues: [294, 295]
triage_notes: |
proposed_slices:
  - id_suffix: -SLICE-1
    title: Astrarunner envelope enrichment — costUsd + tokens + dispatchKind + iterationIndex
    points: 5
started_at: 2026-07-01
slices_complete: [SLICE-136]
completed_at: 2026-07-01
---
# FEAT-203: Astrarunner envelope enrichment (costUsd + tokens + dispatchKind + iterationIndex)

## Source

GitHub issues #293, #294, #295 (astragenie/runner-plugin).

## Description

Enrich the `slice.agent_completed` envelope emitted by `postAgentCompletions()` (`src/scripts/lib/slice-linker/astrarunner-ingest.mts`) so the Astrarunner UI can render per-agent temporal charts (Recharts) with real cost + token + retry-iteration + orchestration-mode data instead of the current mocked / duration-share estimates.

## What ships

Additive fields to `slice.agent_completed` payload + `schemas/loop-events/agent-dispatch.schema.json`:

- `agentId` (string, nullable) — hook-provided `agent_id` (17-char hex, e.g. `"a3b0c4bf20d2d21dd"`). Already in SubagentStart/Stop payloads, already parsed by `pairAgentEvents()` at `agent-report-writer.mts:148,153`, currently discarded at envelope emit. Passing through is free. Chart-key candidate for Recharts; not a primary key contract.
- `costUsd` (number, ≥ 0) — derived from token counts × per-model rate table.
- `inputTokens` (integer, ≥ 0) — sum of `message.usage.input_tokens` across transcript assistant messages. Currently `null` in emitted payload because `parseTranscript()` doesn't accumulate it.
- `outputTokens` (integer, ≥ 0) — sum of `message.usage.output_tokens`.
- `cacheReadInputTokens` (integer, ≥ 0) — sum of `message.usage.cache_read_input_tokens` (cached input, cheaper rate).
- `cacheCreationInputTokens` (integer, ≥ 0) — sum of `message.usage.cache_creation_input_tokens` (cache-write, premium rate).
- `dispatchKind` (enum `"auto" | "manual" | "wave" | "hierarchical"` | null) — orchestration path that fired the dispatch. Threaded through `DispatchOpts.dispatchKind`.
- `iterationIndex` (integer ≥ 0, default 0) — retry counter for same `(sliceId, agent)`. Supplied by orchestrator at dispatch-decision site via `DispatchOpts.iterationIndex`. NOT auto-computed (race under wave-mode parallel worktrees).
- `schemaVersion` bumped `"v1"` → `"v1.1"` on emitted envelope so FE can feature-gate on presence.

## What was dropped (per architect-reviewer)

- **`parentAgentRunId`** — Claude Code SubagentStart hook payload has no `parent_agent_id` field (verified against real payloads under `.claude/logs/payloads/`). Would ship permanently-null field.
- **`agentRunId` as client-supplied primary key** — Astrarunner ingest already accepts per-agent rows without one (FEAT-228/230 evidence). Emitting hook-native `agentId` above is a free pass-through, but NOT a client-supplied pk contract; Astrarunner BE remains authoritative for its own pk.

## Acceptance Criteria

**AC-1 — Token accumulation from transcript**
- Given: an agent transcript at `<transcript_path>` with N assistant messages, each carrying `message.usage.{input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens}`
- When: `parseTranscript(transcript_path)` is invoked from `agent-report-writer.mts`
- Then: the returned object includes `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens` as the sum of the respective `message.usage.*` fields across all assistant messages, treating absent fields as 0. Existing return fields (`turns, model, tools, skills`) unchanged.

**AC-2 — Cost derivation via rate table**
- Given: token totals from AC-1 and a per-model rate table (Sonnet 4.6, Opus 4.7, Haiku 4.5 minimum)
- When: `deriveCostUsd({ model, inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens })` is called
- Then: returns `input * inputRate + output * outputRate + cacheRead * cacheReadRate + cacheCreation * cacheCreationRate` where rates are model-specific. Unknown model returns 0 (safe fallback, does not throw). Rate table lookup order: `.claude/loop.json` config override at `loop.costRates` → hardcoded fallback.

**AC-3 — `slice.agent_completed` envelope carries new fields**
- Given: an agent row from `agent-report-writer.mts` with `agentId` populated from the paired SubagentStop payload, tokens + cost derived per AC-1/AC-2
- When: `buildEnvelope()` in `astrarunner-ingest.mts` is called for that row
- Then: emitted envelope payload includes `agentId, costUsd, inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens, dispatchKind, iterationIndex`. Envelope-level `schemaVersion` = `"v1.1"`. Missing dispatchKind (row.dispatchKind undefined) → payload emits `null`. Missing iterationIndex → payload emits `0`. Missing agentId → payload emits `null`.

**AC-4 — `DispatchOpts` carries dispatchKind + iterationIndex**
- Given: an updated `DispatchOpts` interface in `auto-dispatch.mts` with new optional fields `dispatchKind?: "auto" | "manual" | "wave" | "hierarchical"` and `iterationIndex?: number`
- When: `dispatchAgent()` is called with those fields set
- Then: the fields are written into the audit log entry at `.claude/artifacts/loop/auto-dispatch.jsonl` (existing `buildAuditEntry` extended) and threaded into the fanout envelope. Absence defaults: `dispatchKind: null`, `iterationIndex: 0`.

**AC-5 — Schema additions**
- Given: `schemas/loop-events/agent-dispatch.schema.json`
- When: the schema is inspected
- Then: the `properties` object contains new entries for `agentId, cacheReadInputTokens, cacheCreationInputTokens, dispatchKind, iterationIndex`. `agentId` uses `"type": ["string", "null"]`. `dispatchKind` uses `"enum": ["auto", "manual", "wave", "hierarchical"]` with `"nullable"` via `"type": ["string", "null"]`. `iterationIndex` is `"integer", minimum: 0`. `required` array unchanged (backward-compat).

**AC-6 — Test coverage**
- Given: existing tests in `src/tests/auto-dispatch.test.mts` (audit-log fields) and any transcript-parsing test
- When: new tests are added for: (a) `parseTranscript` accumulates tokens from a fixture transcript with 3 assistant messages carrying usage fields; (b) `deriveCostUsd` correctness across Sonnet/Opus/Haiku including cache rates; (c) `deriveCostUsd` returns 0 for unknown model; (d) `dispatchAgent` audit line contains `dispatchKind + iterationIndex` when set; (e) `buildEnvelope` payload contains all new fields with correct defaults when absent
- Then: all pass. `bun test src/tests/ --parallel --timeout 60000` fully green. `bunx eslint` zero new warnings. `bunx tsc --project tsconfig.json --noEmit` clean.

## Edge Cases

- **Empty transcript** — no assistant messages: all token totals return 0, cost 0, envelope emits 0 not null.
- **Assistant message missing `usage` block** — treated as zero contribution, no error.
- **Cache fields absent on older Claude API responses** — treated as 0; not required.
- **Model string not in rate table** — costUsd = 0 (fail-safe, no throw); warning logged once per session to stderr.
- **`iterationIndex` supplied as negative** — clamped to 0 with warn.
- **`dispatchKind` supplied outside enum** — validated by dispatchAgent, coerced to null with warn.

## References

- GH #293: https://github.com/astragenie/runner-plugin/issues/293 (revised scope in comments)
- GH #294: https://github.com/astragenie/runner-plugin/issues/294
- GH #295: https://github.com/astragenie/runner-plugin/issues/295
- FEAT-228, FEAT-230 (done) — prior astrarunner-ingest work
- Architect-review pass 2026-07-01 (this session)
- `src/scripts/lib/slice-linker/agent-report-writer.mts:194-228` — parseTranscript (extend here)
- `src/scripts/lib/slice-linker/astrarunner-ingest.mts:56-85` — buildEnvelope (extend here)
- `src/scripts/lib/auto-dispatch.mts:12-25` — DispatchOpts (extend here)
- `schemas/loop-events/agent-dispatch.schema.json` — schema surface

## Rate table (initial hardcoded fallback)

Per Anthropic pricing 2026-06 (verify at implementation time):

| Model | input $/MTok | output $/MTok | cache-read $/MTok | cache-write $/MTok |
|---|---|---|---|---|
| claude-sonnet-4-6 | 3.00 | 15.00 | 0.30 | 3.75 |
| claude-opus-4-7 | 15.00 | 75.00 | 1.50 | 18.75 |
| claude-haiku-4-5 | 1.00 | 5.00 | 0.10 | 1.25 |

Overridable via `.claude/loop.json` at `loop.costRates: { "<model-id>": { input, output, cacheRead, cacheCreation } }`.
