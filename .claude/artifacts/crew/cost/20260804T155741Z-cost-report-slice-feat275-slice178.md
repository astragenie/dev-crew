---
kind: cost-report
feature: FEAT-275
run_title: "FEAT275 SLICE178"
usd: 0.933
duration_ms: 94913
total_tokens: 2229202
cache_hit_pct: 99.1
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T15:57:41.328Z
---

# Cost Report: FEAT275 SLICE178

- Created: 2026-08-04T15:57:41.328Z
- Run Title: FEAT275 SLICE178
- Window Start: 2026-08-04T15:56:05.461Z
- Window End: 2026-08-04T15:57:40.374Z
- Duration: 1.6 min (94913 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 19
- Total Tokens: 2,229,202
- Cache Hit %: 99.1%
- Total USD: $0.9330
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 38
- cache_create_5m: 0
- cache_create_1h: 19,283
- cache_read: 2,199,387
- output: 10,494

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 19 msgs (100%), $0.9330 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 7
- Edit: 2
- Read: 1

## Tool Result Sizes (bytes)

- count: 11
- sum: 9,905
- p50: 442
- p90: 2,132
- max: 2,832

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 7 calls, 5,094B results, ~14,242 cache_create tok (2.8×)
- Read: 1 calls, 2,832B results, ~2,578 cache_create tok (0.91×)
- Edit: 2 calls, 485B results, ~909 cache_create tok (1.87×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 19
- usd: $0.9330
- input: 38
- cache_create_5m: 0
- cache_create_1h: 19,283
- cache_read: 2,199,387
- output: 10,494

