---
feature: FEAT-203
status: active
---
# Run Brief: FEAT203 SLICE136: Astrarunner envelope enrichment — costUsd + tokens + dispatchKind + iterationIndex

- Created: 2026-07-01T23:16:05.918Z
- Tier: full
- Goal: Enrich `slice.agent_completed` envelope + `agent-dispatch.schema.json` with per-agent cost, token counts (input/output + cache read/write), orchestration path (dispatchKind), retry counter (iterationIndex), and pass-through of hook-native `agentId`. All fields additive-optional; back-compat unchanged.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Extend `parseTranscript()` (`src/scripts/lib/slice-linker/agent-report-writer.mts:194-228`) to accumulate `message.usage.{input_tokens
  - output_tokens
  - cache_read_input_tokens
  - cache_creation_input_tokens}` across assistant messages. Return them alongside existing `{turns
  - model
  - tools
  - skills}`.
- New module `src/scripts/lib/cost-rate-table.mts` exporting `deriveCostUsd({model
  - inputTokens
  - outputTokens
  - cacheReadInputTokens
  - cacheCreationInputTokens}
  - ratesOverride?)`. Hardcoded fallback for Sonnet 4.6
  - Opus 4.7
  - Haiku 4.5. Config override via `loop.costRates` in `.claude/loop.json`. Unknown model → 0 (fail-safe).
- Extend `AgentRow` (`astrarunner-ingest.mts:24-41`) with `agentId?
  - cacheReadInputTokens?
  - cacheCreationInputTokens?
  - costUsd?
  - dispatchKind?
  - iterationIndex?`.
- Extend `bui
- Out Of Scope:
  - - Astrarunner FE / BE changes (separate repo).
- `parentAgentRunId` — dropped (no `parent_agent_id` in hook payload).
- `agentRunId` as client-supplied primary key — dropped (Astrarunner assigns pk).
- Threading `dispatchKind` at ALL call sites — this slice adds the field surface; call sites can start populating in follow-up. Default `null` accepted.
- Threading `iterationIndex` at ALL retry sites
- Planned Files: -
- Next Step: Begin implementation

