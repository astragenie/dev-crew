---
kind: cost-report
feature: FEAT-066
run_title: "FEAT066 SLICE62"
usd: 26.9336
duration_ms: 300410
total_tokens: 17036108
cache_hit_pct: 99.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-06T16:19:59.870Z
---

# Cost Report: FEAT066 SLICE62

- Created: 2026-06-06T16:19:59.870Z
- Run Title: FEAT066 SLICE62
- Window Start: 2026-06-06T16:14:50.129Z
- Window End: 2026-06-06T16:19:50.539Z
- Duration: 5.0 min (300410 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 21
- Total Tokens: 17,036,108
- Cache Hit %: 99.9%
- Total USD: $26.9336
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 21
- cache_create_5m: 0
- cache_create_1h: 19,993
- cache_read: 17,005,082
- output: 11,012

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 21 msgs (100%), $26.9336 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 11
- Edit: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 14
- sum: 5,572
- p50: 300
- p90: 632
- max: 1,273

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 10 calls, 5,003B results, ~10,928 cache_create tok (2.18×)
- Write: 1 calls, 150B results, ~6,502 cache_create tok (43.35×)
- Edit: 2 calls, 320B results, ~2,348 cache_create tok (7.34×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 21
- usd: $26.9336
- input: 21
- cache_create_5m: 0
- cache_create_1h: 19,993
- cache_read: 17,005,082
- output: 11,012

