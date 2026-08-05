---
kind: cost-report
feature: FEAT-288
run_title: "FEAT288 SLICE204"
usd: 2.9397
duration_ms: 275135
total_tokens: 8364668
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-05T05:57:18.035Z
---

# Cost Report: FEAT288 SLICE204

- Created: 2026-08-05T05:57:18.035Z
- Run Title: FEAT288 SLICE204
- Window Start: 2026-08-05T05:52:41.813Z
- Window End: 2026-08-05T05:57:16.948Z
- Duration: 4.6 min (275135 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 22
- Total Tokens: 8,364,668
- Cache Hit %: 99.7%
- Total USD: $2.9397
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 44
- cache_create_5m: 0
- cache_create_1h: 24,578
- cache_read: 8,320,315
- output: 19,731

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 22 msgs (100%), $2.9397 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 9

## Tool Result Sizes (bytes)

- count: 10
- sum: 4,909
- p50: 376
- p90: 2,386
- max: 2,386

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 9 calls, 4,584B results, ~23,504 cache_create tok (5.13×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 22
- usd: $2.9397
- input: 44
- cache_create_5m: 0
- cache_create_1h: 24,578
- cache_read: 8,320,315
- output: 19,731

