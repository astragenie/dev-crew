---
kind: cost-report
feature: FEAT-193
run_title: "FEAT193 SLICE109"
usd: 16.8563
duration_ms: 207746
total_tokens: 9838920
cache_hit_pct: 99.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T13:28:03.196Z
---

# Cost Report: FEAT193 SLICE109

- Created: 2026-06-12T13:28:03.196Z
- Run Title: FEAT193 SLICE109
- Window Start: 2026-06-12T13:24:34.995Z
- Window End: 2026-06-12T13:28:02.741Z
- Duration: 3.5 min (207746 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 14
- Total Tokens: 9,838,920
- Cache Hit %: 99.8%
- Total USD: $16.8563
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 14
- cache_create_5m: 0
- cache_create_1h: 18,766
- cache_read: 9,798,876
- output: 21,264

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 14 msgs (100%), $16.8563 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 4
- Write: 3
- Edit: 3
- Read: 2

## Tool Result Sizes (bytes)

- count: 12
- sum: 3,911
- p50: 136
- p90: 1,011
- max: 1,562

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 3 calls, 1,751B results, ~12,712 cache_create tok (7.26×)
- Write: 3 calls, 417B results, ~1,736 cache_create tok (4.16×)
- Edit: 3 calls, 447B results, ~1,332 cache_create tok (2.98×)
- Read: 2 calls, 1,089B results, ~760 cache_create tok (0.7×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 14
- usd: $16.8563
- input: 14
- cache_create_5m: 0
- cache_create_1h: 18,766
- cache_read: 9,798,876
- output: 21,264

