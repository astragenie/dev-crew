---
kind: cost-report
feature: FEAT-288
run_title: "FEAT288 SLICE204"
usd: 9.5192
duration_ms: 1168674
total_tokens: 26268558
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-05T05:53:08.195Z
---

# Cost Report: FEAT288 SLICE204

- Created: 2026-08-05T05:53:08.195Z
- Run Title: FEAT288 SLICE204
- Window Start: 2026-08-05T05:33:13.139Z
- Window End: 2026-08-05T05:52:41.813Z
- Duration: 19.5 min (1168674 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 76
- Total Tokens: 26,268,558
- Cache Hit %: 99.6%
- Total USD: $9.5192
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 152
- cache_create_5m: 0
- cache_create_1h: 114,793
- cache_read: 26,086,681
- output: 66,932

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 76 msgs (100%), $9.5192 (100%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 2351
- turns_before_first_tool: 0
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 28
- Agent: 4
- Edit: 4
- Read: 3

## Tool Result Sizes (bytes)

- count: 39
- sum: 21,166
- p50: 240
- p90: 1,591
- max: 3,262

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 27 calls, 13,735B results, ~65,412 cache_create tok (4.76×)
- Agent: 4 calls, 1,226B results, ~39,841 cache_create tok (32.5×)
- Edit: 4 calls, 837B results, ~5,166 cache_create tok (6.17×)
- Read: 3 calls, 5,247B results, ~4,145 cache_create tok (0.79×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 76
- usd: $9.5192
- input: 152
- cache_create_5m: 0
- cache_create_1h: 114,793
- cache_read: 26,086,681
- output: 66,932

