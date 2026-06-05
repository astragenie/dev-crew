---
kind: cost-report
feature: FEAT-042
run_title: "FEAT042 SLICE42"
usd: 1.2829
duration_ms: 242173
total_tokens: 3094682
cache_hit_pct: 99.3
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T06:43:49.518Z
---

# Cost Report: FEAT042 SLICE42

- Created: 2026-06-05T06:43:49.518Z
- Run Title: FEAT042 SLICE42
- Window Start: 2026-06-05T06:39:47.244Z
- Window End: 2026-06-05T06:43:49.417Z
- Duration: 4.0 min (242173 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 21
- Total Tokens: 3,094,682
- Cache Hit %: 99.3%
- Total USD: $1.2829
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 21
- cache_create_5m: 0
- cache_create_1h: 21,485
- cache_read: 3,057,396
- output: 15,780

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 21 msgs (100%), $1.2829 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 8 (1 failed)
- Edit: 4
- Read: 2

## Tool Result Sizes (bytes)

- count: 15
- sum: 14,342
- p50: 224
- p90: 1,428
- max: 9,581

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Edit: 4 calls, 687B results, ~10,334 cache_create tok (15.04×)
- Bash: 8 calls, 11,522B results, ~9,763 cache_create tok (0.85×)
- Read: 2 calls, 1,966B results, ~994 cache_create tok (0.51×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 21
- usd: $1.2829
- input: 21
- cache_create_5m: 0
- cache_create_1h: 21,485
- cache_read: 3,057,396
- output: 15,780

