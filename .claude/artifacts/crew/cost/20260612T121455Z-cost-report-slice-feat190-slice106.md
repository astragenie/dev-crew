---
kind: cost-report
feature: FEAT-190
run_title: "FEAT190 SLICE106"
usd: 10.4223
duration_ms: 164510
total_tokens: 5269594
cache_hit_pct: 99.4
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T12:14:55.237Z
---

# Cost Report: FEAT190 SLICE106

- Created: 2026-06-12T12:14:55.237Z
- Run Title: FEAT190 SLICE106
- Window Start: 2026-06-12T12:12:10.313Z
- Window End: 2026-06-12T12:14:54.823Z
- Duration: 2.7 min (164510 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 11
- Total Tokens: 5,269,594
- Cache Hit %: 99.4%
- Total USD: $10.4223
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 11
- cache_create_5m: 0
- cache_create_1h: 29,756
- cache_read: 5,217,110
- output: 22,717

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 11 msgs (100%), $10.4223 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Edit: 5
- Bash: 3

## Tool Result Sizes (bytes)

- count: 9
- sum: 1,212
- p50: 165
- p90: 168
- max: 168

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Edit: 5 calls, 822B results, ~12,790 cache_create tok (15.56×)
- Bash: 3 calls, 222B results, ~12,128 cache_create tok (54.63×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 11
- usd: $10.4223
- input: 11
- cache_create_5m: 0
- cache_create_1h: 29,756
- cache_read: 5,217,110
- output: 22,717

