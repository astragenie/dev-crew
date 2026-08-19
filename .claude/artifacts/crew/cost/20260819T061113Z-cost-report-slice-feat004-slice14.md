---
kind: cost-report
feature: FEAT-004
run_title: "FEAT004 SLICE14"
usd: 20.7022
duration_ms: 10994200
total_tokens: 61029050
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T06:11:13.658Z
---

# Cost Report: FEAT004 SLICE14

- Created: 2026-08-19T06:11:13.658Z
- Run Title: FEAT004 SLICE14
- Window Start: 2026-08-19T03:07:55.529Z
- Window End: 2026-08-19T06:11:09.729Z
- Duration: 183.2 min (10994200 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 98
- Total Tokens: 61,029,050
- Cache Hit %: 99.7%
- Total USD: $20.7022
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 196
- cache_create_5m: 0
- cache_create_1h: 161,032
- cache_read: 60,767,479
- output: 100,343

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 98 msgs (100%), $20.7022 (100%)

## Conversation Shape

- user_msg_count: 27
- user_msg_avg_len: 2204
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 6

## Tool Usage

- Bash: 11
- Agent: 6
- SendMessage: 4
- Workflow: 4

## Tool Result Sizes (bytes)

- count: 25
- sum: 11,850
- p50: 323
- p90: 1,243
- max: 1,249

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Workflow: 4 calls, 4,967B results, ~69,425 cache_create tok (13.98×)
- Bash: 10 calls, 2,890B results, ~41,425 cache_create tok (14.33×)
- Agent: 6 calls, 1,912B results, ~31,955 cache_create tok (16.71×)
- SendMessage: 4 calls, 1,504B results, ~16,100 cache_create tok (10.7×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 98
- usd: $20.7022
- input: 196
- cache_create_5m: 0
- cache_create_1h: 161,032
- cache_read: 60,767,479
- output: 100,343

