---
kind: cost-report
feature: FEAT-048
run_title: "FEAT048 SLICE46"
usd: 0.252
duration_ms: 32347
total_tokens: 538016
cache_hit_pct: 98.2
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T10:41:18.551Z
---

# Cost Report: FEAT048 SLICE46

- Created: 2026-06-05T10:41:18.551Z
- Run Title: FEAT048 SLICE46
- Window Start: 2026-06-05T10:40:46.069Z
- Window End: 2026-06-05T10:41:18.416Z
- Duration: 0.5 min (32347 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 8
- Total Tokens: 538,016
- Cache Hit %: 98.2%
- Total USD: $0.2520
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 8
- cache_create_5m: 0
- cache_create_1h: 9,551
- cache_read: 526,000
- output: 2,457

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 8 msgs (100%), $0.2520 (100.01%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 4

## Tool Result Sizes (bytes)

- count: 5
- sum: 10,001
- p50: 1,542
- p90: 5,003
- max: 5,003

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 4 calls, 7,039B results, ~6,461 cache_create tok (0.92×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 8
- usd: $0.2520
- input: 8
- cache_create_5m: 0
- cache_create_1h: 9,551
- cache_read: 526,000
- output: 2,457

