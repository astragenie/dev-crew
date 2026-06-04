---
kind: cost-report
feature: FEAT-032
run_title: "FEAT032 SLICE34"
usd: 23.2464
duration_ms: 99276
total_tokens: 14403986
cache_hit_pct: 99.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T16:45:10.769Z
---

# Cost Report: FEAT032 SLICE34

- Created: 2026-06-04T16:45:10.769Z
- Run Title: FEAT032 SLICE34
- Window Start: 2026-06-04T16:43:31.449Z
- Window End: 2026-06-04T16:45:10.725Z
- Duration: 1.7 min (99276 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 25
- Total Tokens: 14,403,986
- Cache Hit %: 99.9%
- Total USD: $23.2464
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 35
- cache_create_5m: 0
- cache_create_1h: 16,903
- cache_read: 14,371,290
- output: 15,758

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 25 msgs (100%), $23.2464 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 17
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 11
- Grep: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 14
- sum: 7,205
- p50: 519
- p90: 1,254
- max: 1,483

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 11 calls, 5,968B results, ~14,100 cache_create tok (2.36×)
- Grep: 1 calls, 1,033B results, ~1,525 cache_create tok (1.48×)
- Write: 1 calls, 166B results, ~0 cache_create tok (0×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 25
- usd: $23.2464
- input: 35
- cache_create_5m: 0
- cache_create_1h: 16,903
- cache_read: 14,371,290
- output: 15,758

