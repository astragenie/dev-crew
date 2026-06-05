---
kind: cost-report
feature: FEAT-042
run_title: "FEAT042 SLICE42"
usd: 1.3332
duration_ms: 245233
total_tokens: 3250832
cache_hit_pct: 99.3
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T06:43:52.580Z
---

# Cost Report: FEAT042 SLICE42

- Created: 2026-06-05T06:43:52.580Z
- Run Title: FEAT042 SLICE42
- Window Start: 2026-06-05T06:39:47.244Z
- Window End: 2026-06-05T06:43:52.477Z
- Duration: 4.1 min (245233 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 22
- Total Tokens: 3,250,832
- Cache Hit %: 99.3%
- Total USD: $1.3332
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 22
- cache_create_5m: 0
- cache_create_1h: 21,690
- cache_read: 3,213,186
- output: 15,934

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 22 msgs (100%), $1.3332 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 9 (2 failed)
- Edit: 4
- Read: 2

## Tool Result Sizes (bytes)

- count: 16
- sum: 14,708
- p50: 303
- p90: 1,428
- max: 9,581

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Edit: 4 calls, 687B results, ~10,334 cache_create tok (15.04×)
- Bash: 9 calls, 11,888B results, ~9,968 cache_create tok (0.84×)
- Read: 2 calls, 1,966B results, ~994 cache_create tok (0.51×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 22
- usd: $1.3332
- input: 22
- cache_create_5m: 0
- cache_create_1h: 21,690
- cache_read: 3,213,186
- output: 15,934

