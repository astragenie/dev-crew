---
kind: cost-report
feature: FEAT-059
run_title: "FEAT059 SLICE57"
usd: 46.3989
duration_ms: 819947
total_tokens: 28715123
cache_hit_pct: 99.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-06T15:12:12.438Z
---

# Cost Report: FEAT059 SLICE57

- Created: 2026-06-06T15:12:12.438Z
- Run Title: FEAT059 SLICE57
- Window Start: 2026-06-06T14:58:23.243Z
- Window End: 2026-06-06T15:12:03.190Z
- Duration: 13.7 min (819947 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 46
- Total Tokens: 28,715,123
- Cache Hit %: 99.8%
- Total USD: $46.3989
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 56
- cache_create_5m: 0
- cache_create_1h: 47,863
- cache_read: 28,640,519
- output: 26,685

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 46 msgs (100%), $46.3989 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 19
- Read: 5
- Edit: 3
- Agent: 1

## Tool Result Sizes (bytes)

- count: 28
- sum: 10,927
- p50: 215
- p90: 1,210
- max: 2,105

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 3× C:\work\mega\loop\src\scripts\lib\stop-conditions.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 18 calls, 3,700B results, ~19,288 cache_create tok (5.21×)
- Agent: 1 calls, 298B results, ~14,056 cache_create tok (47.17×)
- Edit: 3 calls, 486B results, ~7,012 cache_create tok (14.43×)
- Read: 5 calls, 5,924B results, ~6,412 cache_create tok (1.08×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 46
- usd: $46.3989
- input: 56
- cache_create_5m: 0
- cache_create_1h: 47,863
- cache_read: 28,640,519
- output: 26,685

