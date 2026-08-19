---
kind: cost-report
feature: FEAT-003
run_title: "FEAT003 SLICE12"
usd: 2.2233
duration_ms: 1608961
total_tokens: 6639453
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T02:32:19.689Z
---

# Cost Report: FEAT003 SLICE12

- Created: 2026-08-19T02:32:19.689Z
- Run Title: FEAT003 SLICE12
- Window Start: 2026-08-19T02:05:27.578Z
- Window End: 2026-08-19T02:32:16.539Z
- Duration: 26.8 min (1608961 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 12
- Total Tokens: 6,639,453
- Cache Hit %: 99.7%
- Total USD: $2.2233
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 24
- cache_create_5m: 0
- cache_create_1h: 19,253
- cache_read: 6,611,902
- output: 8,274

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 12 msgs (100%), $2.2233 (100%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 2317
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Agent: 2
- Bash: 1

## Tool Result Sizes (bytes)

- count: 3
- sum: 1,508
- p50: 315
- p90: 880
- max: 880

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 628B results, ~17,205 cache_create tok (27.4×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 12
- usd: $2.2233
- input: 24
- cache_create_5m: 0
- cache_create_1h: 19,253
- cache_read: 6,611,902
- output: 8,274

