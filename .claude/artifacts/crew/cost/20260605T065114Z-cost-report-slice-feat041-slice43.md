---
kind: cost-report
feature: FEAT-041
run_title: "FEAT041 SLICE43"
usd: 0.5217
duration_ms: 63078
total_tokens: 1218116
cache_hit_pct: 98.6
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T06:51:14.579Z
---

# Cost Report: FEAT041 SLICE43

- Created: 2026-06-05T06:51:14.579Z
- Run Title: FEAT041 SLICE43
- Window Start: 2026-06-05T06:50:11.381Z
- Window End: 2026-06-05T06:51:14.459Z
- Duration: 1.1 min (63078 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 18
- Total Tokens: 1,218,116
- Cache Hit %: 98.6%
- Total USD: $0.5217
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 18
- cache_create_5m: 0
- cache_create_1h: 16,948
- cache_read: 1,197,095
- output: 4,055

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 18 msgs (100%), $0.5217 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 10 (3 failed)
- Write: 1

## Tool Result Sizes (bytes)

- count: 12
- sum: 17,693
- p50: 107
- p90: 4,537
- max: 5,100

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 10 calls, 14,076B results, ~13,465 cache_create tok (0.96×)
- Write: 1 calls, 221B results, ~0 cache_create tok (0×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 18
- usd: $0.5217
- input: 18
- cache_create_5m: 0
- cache_create_1h: 16,948
- cache_read: 1,197,095
- output: 4,055

