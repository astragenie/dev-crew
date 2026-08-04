---
kind: cost-report
feature: FEAT-284
run_title: "FEAT284 SLICE188"
usd: 9.3952
duration_ms: 1602572
total_tokens: 25402714
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T18:54:51.471Z
---

# Cost Report: FEAT284 SLICE188

- Created: 2026-08-04T18:54:51.471Z
- Run Title: FEAT284 SLICE188
- Window Start: 2026-08-04T18:28:07.343Z
- Window End: 2026-08-04T18:54:49.915Z
- Duration: 26.7 min (1602572 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 92
- Total Tokens: 25,402,714
- Cache Hit %: 99.6%
- Total USD: $9.3952
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 184
- cache_create_5m: 0
- cache_create_1h: 112,454
- cache_read: 25,213,006
- output: 77,070

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 92 msgs (100%), $9.3952 (100%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 2166
- turns_before_first_tool: 1
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Bash: 32
- Read: 5
- Agent: 3
- Edit: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 43
- sum: 28,252
- p50: 307
- p90: 1,568
- max: 4,014

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 3× C:\Users\serge\AppData\Local\Temp\claude\C--work-mega-runner-plugin\0d817539-d7f7-453b-9dd5-3a1a24c6007d\tasks\bonu20xa9.output
  - 2× C:\Users\serge\AppData\Local\Temp\claude\C--work-mega-runner-plugin\0d817539-d7f7-453b-9dd5-3a1a24c6007d\tasks\bs69d613k.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 31 calls, 21,764B results, ~90,021 cache_create tok (4.14×)
- Agent: 3 calls, 919B results, ~9,704 cache_create tok (10.56×)
- Read: 5 calls, 958B results, ~3,536 cache_create tok (3.69×)
- Write: 1 calls, 223B results, ~2,691 cache_create tok (12.07×)
- Edit: 2 calls, 374B results, ~2,664 cache_create tok (7.12×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 92
- usd: $9.3952
- input: 184
- cache_create_5m: 0
- cache_create_1h: 112,454
- cache_read: 25,213,006
- output: 77,070

