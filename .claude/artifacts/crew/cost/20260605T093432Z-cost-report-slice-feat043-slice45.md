---
kind: cost-report
feature: FEAT-043
run_title: "FEAT043 SLICE45"
usd: 2.8454
duration_ms: 876236
total_tokens: 6815203
cache_hit_pct: 99.0
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T09:34:32.449Z
---

# Cost Report: FEAT043 SLICE45

- Created: 2026-06-05T09:34:32.449Z
- Run Title: FEAT043 SLICE45
- Window Start: 2026-06-05T09:19:56.087Z
- Window End: 2026-06-05T09:34:32.323Z
- Duration: 14.6 min (876236 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 74
- Total Tokens: 6,815,203
- Cache Hit %: 99.0%
- Total USD: $2.8454
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 80
- cache_create_5m: 0
- cache_create_1h: 66,753
- cache_read: 6,719,790
- output: 28,580

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 74 msgs (100%), $2.8454 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 29
- Read: 7
- Edit: 6
- Agent: 1
- Glob: 1

## Tool Result Sizes (bytes)

- count: 45
- sum: 42,562
- p50: 435
- p90: 2,492
- max: 6,950

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 4× C:\work\mega\loop\src\scripts\lib\pm-scorer.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 29 calls, 21,795B results, ~30,204 cache_create tok (1.39×)
- Read: 7 calls, 16,323B results, ~17,049 cache_create tok (1.04×)
- Edit: 6 calls, 904B results, ~10,508 cache_create tok (11.62×)
- Agent: 1 calls, 285B results, ~6,618 cache_create tok (23.22×)
- Glob: 1 calls, 79B results, ~146 cache_create tok (1.85×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 74
- usd: $2.8454
- input: 80
- cache_create_5m: 0
- cache_create_1h: 66,753
- cache_read: 6,719,790
- output: 28,580

