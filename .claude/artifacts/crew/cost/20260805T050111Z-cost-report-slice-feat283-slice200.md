---
kind: cost-report
feature: FEAT-283
run_title: "FEAT283 SLICE200"
usd: 2.5359
duration_ms: 235748
total_tokens: 5984245
cache_hit_pct: 99.2
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-05T05:01:11.093Z
---

# Cost Report: FEAT283 SLICE200

- Created: 2026-08-05T05:01:11.093Z
- Run Title: FEAT283 SLICE200
- Window Start: 2026-08-05T04:57:14.394Z
- Window End: 2026-08-05T05:01:10.142Z
- Duration: 3.9 min (235748 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 28
- Total Tokens: 5,984,245
- Cache Hit %: 99.2%
- Total USD: $2.5359
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 56
- cache_create_5m: 0
- cache_create_1h: 48,708
- cache_read: 5,903,998
- output: 31,483

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 28 msgs (100%), $2.5359 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 2386
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 8
- Edit: 4
- Agent: 1

## Tool Result Sizes (bytes)

- count: 13
- sum: 6,306
- p50: 252
- p90: 1,431
- max: 1,735

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 7 calls, 4,741B results, ~30,666 cache_create tok (6.47×)
- Edit: 4 calls, 1,008B results, ~9,327 cache_create tok (9.25×)
- Agent: 1 calls, 305B results, ~6,653 cache_create tok (21.81×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 28
- usd: $2.5359
- input: 56
- cache_create_5m: 0
- cache_create_1h: 48,708
- cache_read: 5,903,998
- output: 31,483

