---
kind: cost-report
feature: FEAT-184
run_title: "FEAT184 SLICE92"
usd: 19.8946
duration_ms: 1536708
total_tokens: 9262662
cache_hit_pct: 99
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-11T11:31:36.906Z
---

# Cost Report: FEAT184 SLICE92

- Created: 2026-06-11T11:31:36.906Z
- Run Title: FEAT184 SLICE92
- Window Start: 2026-06-11T11:05:59.833Z
- Window End: 2026-06-11T11:31:36.541Z
- Duration: 25.6 min (1536708 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 22
- Total Tokens: 9,262,662
- Cache Hit %: 99%
- Total USD: $19.8946
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 52
- cache_create_5m: 0
- cache_create_1h: 90,149
- cache_read: 9,125,786
- output: 46,675

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 22 msgs (100%), $19.8946 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 5

## Tool Usage

- Agent: 5
- PowerShell: 3
- Read: 1

## Tool Result Sizes (bytes)

- count: 10
- sum: 23,938
- p50: 1,547
- p90: 8,162
- max: 8,162

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 5 calls, 7,280B results, ~60,355 cache_create tok (8.29×)
- PowerShell: 3 calls, 3,652B results, ~10,402 cache_create tok (2.85×)
- Read: 1 calls, 4,844B results, ~8,019 cache_create tok (1.66×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 22
- usd: $19.8946
- input: 52
- cache_create_5m: 0
- cache_create_1h: 90,149
- cache_read: 9,125,786
- output: 46,675

