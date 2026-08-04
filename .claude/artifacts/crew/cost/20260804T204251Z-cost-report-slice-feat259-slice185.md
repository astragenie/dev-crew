---
kind: cost-report
feature: FEAT-259
run_title: "FEAT259 SLICE185"
usd: 5.5606
duration_ms: 864867
total_tokens: 16360197
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T20:42:51.553Z
---

# Cost Report: FEAT259 SLICE185

- Created: 2026-08-04T20:42:51.553Z
- Run Title: FEAT259 SLICE185
- Window Start: 2026-08-04T20:28:25.802Z
- Window End: 2026-08-04T20:42:50.669Z
- Duration: 14.4 min (864867 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 35
- Total Tokens: 16,360,197
- Cache Hit %: 99.7%
- Total USD: $5.5606
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 70
- cache_create_5m: 0
- cache_create_1h: 43,331
- cache_read: 16,289,220
- output: 27,576

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 35 msgs (100%), $5.5606 (100%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 697
- turns_before_first_tool: 0
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 13
- Agent: 2

## Tool Result Sizes (bytes)

- count: 16
- sum: 7,495
- p50: 305
- p90: 1,436
- max: 1,613

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 13 calls, 6,651B results, ~32,683 cache_create tok (4.91×)
- Agent: 2 calls, 612B results, ~10,036 cache_create tok (16.4×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 35
- usd: $5.5606
- input: 70
- cache_create_5m: 0
- cache_create_1h: 43,331
- cache_read: 16,289,220
- output: 27,576

