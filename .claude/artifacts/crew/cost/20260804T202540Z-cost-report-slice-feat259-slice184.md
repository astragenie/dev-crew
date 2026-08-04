---
kind: cost-report
feature: FEAT-259
run_title: "FEAT259 SLICE184"
usd: 4.7038
duration_ms: 571962
total_tokens: 13661782
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T20:25:40.346Z
---

# Cost Report: FEAT259 SLICE184

- Created: 2026-08-04T20:25:40.346Z
- Run Title: FEAT259 SLICE184
- Window Start: 2026-08-04T20:16:07.727Z
- Window End: 2026-08-04T20:25:39.689Z
- Duration: 9.5 min (571962 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 31
- Total Tokens: 13,661,782
- Cache Hit %: 99.8%
- Total USD: $4.7038
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 62
- cache_create_5m: 0
- cache_create_1h: 32,644
- cache_read: 13,600,572
- output: 28,504

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 31 msgs (100%), $4.7038 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 815
- turns_before_first_tool: 0
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Bash: 8
- Agent: 3
- Write: 1
- SendMessage: 1

## Tool Result Sizes (bytes)

- count: 14
- sum: 4,495
- p50: 307
- p90: 615
- max: 895

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 3 calls, 925B results, ~13,939 cache_create tok (15.07×)
- Bash: 8 calls, 2,744B results, ~13,809 cache_create tok (5.03×)
- SendMessage: 1 calls, 362B results, ~3,594 cache_create tok (9.93×)
- Write: 1 calls, 232B results, ~737 cache_create tok (3.18×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 31
- usd: $4.7038
- input: 62
- cache_create_5m: 0
- cache_create_1h: 32,644
- cache_read: 13,600,572
- output: 28,504

