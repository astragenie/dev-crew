---
kind: cost-report
feature: FEAT-037
run_title: "FEAT037 SLICE35"
usd: 22.4355
duration_ms: 604319
total_tokens: 13000409
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T16:58:43.963Z
---

# Cost Report: FEAT037 SLICE35

- Created: 2026-06-04T16:58:43.963Z
- Run Title: FEAT037 SLICE35
- Window Start: 2026-06-04T16:48:39.599Z
- Window End: 2026-06-04T16:58:43.918Z
- Duration: 10.1 min (604319 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 20
- Total Tokens: 13,000,409
- Cache Hit %: 99.7%
- Total USD: $22.4355
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 45
- cache_create_5m: 0
- cache_create_1h: 42,565
- cache_read: 12,934,382
- output: 23,417

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 20 msgs (100%), $22.4355 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 22
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 6
- Read: 2
- Write: 2
- Agent: 1

## Tool Result Sizes (bytes)

- count: 13
- sum: 5,274
- p50: 200
- p90: 1,225
- max: 1,462

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 6 calls, 1,911B results, ~19,754 cache_create tok (10.34×)
- Agent: 1 calls, 1,462B results, ~17,172 cache_create tok (11.75×)
- Read: 2 calls, 244B results, ~2,128 cache_create tok (8.72×)
- Write: 2 calls, 395B results, ~1,184 cache_create tok (3×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 20
- usd: $22.4355
- input: 45
- cache_create_5m: 0
- cache_create_1h: 42,565
- cache_read: 12,934,382
- output: 23,417

