---
kind: cost-report
feature: FEAT-001
run_title: "FEAT001 SLICE03"
usd: 2.5416
duration_ms: 954464
total_tokens: 7084091
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-18T21:57:23.162Z
---

# Cost Report: FEAT001 SLICE03

- Created: 2026-08-18T21:57:23.162Z
- Run Title: FEAT001 SLICE03
- Window Start: 2026-08-18T21:41:24.343Z
- Window End: 2026-08-18T21:57:18.807Z
- Duration: 15.9 min (954464 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 21
- Total Tokens: 7,084,091
- Cache Hit %: 99.7%
- Total USD: $2.5416
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 42
- cache_create_5m: 0
- cache_create_1h: 23,034
- cache_read: 7,041,631
- output: 19,384

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 21 msgs (100%), $2.5416 (100%)

## Conversation Shape

- user_msg_count: 7
- user_msg_avg_len: 1116
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Agent: 2
- Bash: 2

## Tool Result Sizes (bytes)

- count: 4
- sum: 5,324
- p50: 579
- p90: 4,117
- max: 4,117

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1 calls, 579B results, ~8,376 cache_create tok (14.47×)
- Agent: 2 calls, 628B results, ~8,232 cache_create tok (13.11×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 21
- usd: $2.5416
- input: 42
- cache_create_5m: 0
- cache_create_1h: 23,034
- cache_read: 7,041,631
- output: 19,384

