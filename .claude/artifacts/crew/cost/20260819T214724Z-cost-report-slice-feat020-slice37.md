---
kind: cost-report
feature: FEAT-020
run_title: "FEAT020 SLICE37"
usd: 2.3262
duration_ms: 514885
total_tokens: 7234259
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T21:47:24.217Z
---

# Cost Report: FEAT020 SLICE37

- Created: 2026-08-19T21:47:24.217Z
- Run Title: FEAT020 SLICE37
- Window Start: 2026-08-19T21:38:46.383Z
- Window End: 2026-08-19T21:47:21.268Z
- Duration: 8.6 min (514885 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 14
- Total Tokens: 7,234,259
- Cache Hit %: 99.8%
- Total USD: $2.3262
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 28
- cache_create_5m: 0
- cache_create_1h: 13,622
- cache_read: 7,215,287
- output: 5,322

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 14 msgs (100%), $2.3262 (100%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 2551
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- SendMessage: 3
- Bash: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 6
- sum: 1,571
- p50: 367
- p90: 378
- max: 378

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 3 calls, 1,121B results, ~10,993 cache_create tok (9.81×)
- Bash: 1 calls, 96B results, ~1,193 cache_create tok (12.43×)
- Write: 1 calls, 230B results, ~961 cache_create tok (4.18×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 14
- usd: $2.3262
- input: 28
- cache_create_5m: 0
- cache_create_1h: 13,622
- cache_read: 7,215,287
- output: 5,322

