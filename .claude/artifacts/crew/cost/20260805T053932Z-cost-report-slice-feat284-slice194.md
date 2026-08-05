---
kind: cost-report
feature: FEAT-284
run_title: "FEAT284 SLICE194"
usd: 2.5206
duration_ms: 377339
total_tokens: 7152178
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-05T05:39:32.325Z
---

# Cost Report: FEAT284 SLICE194

- Created: 2026-08-05T05:39:32.325Z
- Run Title: FEAT284 SLICE194
- Window Start: 2026-08-05T05:33:13.139Z
- Window End: 2026-08-05T05:39:30.478Z
- Duration: 6.3 min (377339 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 22
- Total Tokens: 7,152,178
- Cache Hit %: 99.6%
- Total USD: $2.5206
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 44
- cache_create_5m: 0
- cache_create_1h: 27,593
- cache_read: 7,109,742
- output: 14,799

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 22 msgs (100%), $2.5206 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 5090
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 10
- Agent: 1
- Read: 1
- Edit: 1

## Tool Result Sizes (bytes)

- count: 13
- sum: 4,497
- p50: 137
- p90: 1,092
- max: 1,773

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 9 calls, 2,790B results, ~16,281 cache_create tok (5.84×)
- Agent: 1 calls, 305B results, ~9,680 cache_create tok (31.74×)
- Edit: 1 calls, 189B results, ~823 cache_create tok (4.35×)
- Read: 1 calls, 1,092B results, ~580 cache_create tok (0.53×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 22
- usd: $2.5206
- input: 44
- cache_create_5m: 0
- cache_create_1h: 27,593
- cache_read: 7,109,742
- output: 14,799

