---
kind: cost-report
feature: FEAT-185
run_title: "FEAT185 SLICE93"
usd: 14.0202
duration_ms: 1191822
total_tokens: 6204956
cache_hit_pct: 99.2
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-11T11:57:59.295Z
---

# Cost Report: FEAT185 SLICE93

- Created: 2026-06-11T11:57:59.295Z
- Run Title: FEAT185 SLICE93
- Window Start: 2026-06-11T11:38:07.061Z
- Window End: 2026-06-11T11:57:58.883Z
- Duration: 19.9 min (1191822 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 13
- Total Tokens: 6,204,956
- Cache Hit %: 99.2%
- Total USD: $14.0202
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 38
- cache_create_5m: 0
- cache_create_1h: 50,175
- cache_read: 6,110,086
- output: 44,657

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 13 msgs (100%), $14.0202 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 5

## Tool Usage

- Agent: 5
- PowerShell: 1

## Tool Result Sizes (bytes)

- count: 7
- sum: 12,072
- p50: 1,530
- p90: 4,378
- max: 4,378

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 5 calls, 9,237B results, ~44,049 cache_create tok (4.77×)
- PowerShell: 1 calls, 2,424B results, ~5,133 cache_create tok (2.12×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 13
- usd: $14.0202
- input: 38
- cache_create_5m: 0
- cache_create_1h: 50,175
- cache_read: 6,110,086
- output: 44,657

