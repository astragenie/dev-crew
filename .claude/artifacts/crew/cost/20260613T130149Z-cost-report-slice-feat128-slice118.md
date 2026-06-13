---
kind: cost-report
feature: FEAT-128
run_title: "FEAT128 SLICE118"
usd: 5.7481
duration_ms: 3455019
total_tokens: 12358940
cache_hit_pct: 97.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T13:01:49.517Z
---

# Cost Report: FEAT128 SLICE118

- Created: 2026-06-13T13:01:49.518Z
- Run Title: FEAT128 SLICE118
- Window Start: 2026-06-13T12:04:14.012Z
- Window End: 2026-06-13T13:01:49.031Z
- Duration: 57.6 min (3455019 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 90
- Total Tokens: 12,358,940
- Cache Hit %: 97.9%
- Total USD: $5.7481
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 102
- cache_create_5m: 0
- cache_create_1h: 258,333
- cache_read: 12,061,893
- output: 38,612

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 90 msgs (100%), $5.7481 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 15284
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 32 (1 failed)
- Read: 14
- Agent: 4
- Edit: 2
- Grep: 1

## Tool Result Sizes (bytes)

- count: 57
- sum: 69,095
- p50: 387
- p90: 3,431
- max: 7,759

## File Re-reads

- redundant_read_count: 6
- top paths:
  - 5× C:\work\mega\.-FEAT-128-0\src\scripts\lib\stop-conditions.mts
  - 3× C:\work\mega\.-FEAT-128-0\src\tests\explain-halts.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 33 calls, 16,536B results, ~156,165 cache_create tok (9.44×)
- Agent: 4 calls, 8,967B results, ~59,709 cache_create tok (6.66×)
- Read: 16 calls, 42,640B results, ~30,700 cache_create tok (0.72×)
- Edit: 2 calls, 328B results, ~3,323 cache_create tok (10.13×)
- Grep: 1 calls, 288B results, ~926 cache_create tok (3.22×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 90
- usd: $5.7481
- input: 102
- cache_create_5m: 0
- cache_create_1h: 258,333
- cache_read: 12,061,893
- output: 38,612

