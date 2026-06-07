---
kind: cost-report
feature: FEAT-064
run_title: "FEAT064 SLICE65"
usd: 5.2047
duration_ms: 140263
total_tokens: 3048330
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T01:50:54.155Z
---

# Cost Report: FEAT064 SLICE65

- Created: 2026-06-07T01:50:54.155Z
- Run Title: FEAT064 SLICE65
- Window Start: 2026-06-07T01:48:26.374Z
- Window End: 2026-06-07T01:50:46.637Z
- Duration: 2.3 min (140263 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 8
- Total Tokens: 3,048,330
- Cache Hit %: 99.7%
- Total USD: $5.2047
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 8
- cache_create_5m: 0
- cache_create_1h: 7,689
- cache_read: 3,035,014
- output: 5,619

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 8 msgs (100%), $5.2047 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 5
- Write: 1

## Tool Result Sizes (bytes)

- count: 6
- sum: 4,404
- p50: 445
- p90: 1,877
- max: 1,877

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Write: 1 calls, 190B results, ~3,042 cache_create tok (16.01×)
- Bash: 4 calls, 2,663B results, ~2,843 cache_create tok (1.07×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 8
- usd: $5.2047
- input: 8
- cache_create_5m: 0
- cache_create_1h: 7,689
- cache_read: 3,035,014
- output: 5,619

