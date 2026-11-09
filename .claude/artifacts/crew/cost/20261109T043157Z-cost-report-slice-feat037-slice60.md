---
kind: cost-report
feature: FEAT-037
run_title: "FEAT037 SLICE60"
usd: 4.4491
duration_ms: 413168
total_tokens: 10747218
cache_hit_pct: 99.7
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
run_id: "2026-11-09T04:25:04.184Z_2026-11-09T04:31:57.352Z"
created_at: 2026-11-09T04:31:57.522Z
---

# Cost Report: FEAT037 SLICE60

- Created: 2026-11-09T04:31:57.522Z
- Run Title: FEAT037 SLICE60
- Window Start: 2026-11-09T04:25:04.184Z
- Window End: 2026-11-09T04:31:57.352Z
- Duration: 6.9 min (413168 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 22
- Total Tokens: 10,747,218
- Cache Hit %: 99.7%
- Total USD: $4.4491
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 476
- cache_create_5m: 0
- cache_create_1h: 34,695
- cache_read: 10,690,491
- output: 21,556

## Model Mix

- claude-fable-5-1 (priced as claude-fable-5-1): 22 msgs (100%), $4.4491 (100%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 1082
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 5
- Agent: 2

## Tool Result Sizes (bytes)

- count: 7
- sum: 7,130
- p50: 889
- p90: 2,022
- max: 2,022

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 624B results, ~13,308 cache_create tok (21.33×)
- Bash: 4 calls, 5,413B results, ~11,862 cache_create tok (2.19×)


## By Model (token detail)

### claude-fable-5-1 (priced as claude-fable-5-1)
- messages: 22
- usd: $4.4491
- input: 476
- cache_create_5m: 0
- cache_create_1h: 34,695
- cache_read: 10,690,491
- output: 21,556

