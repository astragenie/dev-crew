---
kind: cost-report
feature: FEAT-040
run_title: "FEAT040 SLICE41"
usd: 1.911
duration_ms: 890149
total_tokens: 3866224
cache_hit_pct: 98.1
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T05:56:29.010Z
---

# Cost Report: FEAT040 SLICE41

- Created: 2026-06-05T05:56:29.010Z
- Run Title: FEAT040 SLICE41
- Window Start: 2026-06-05T05:41:38.755Z
- Window End: 2026-06-05T05:56:28.904Z
- Duration: 14.8 min (890149 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 41
- Total Tokens: 3,866,224
- Cache Hit %: 98.1%
- Total USD: $1.9110
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 47
- cache_create_5m: 0
- cache_create_1h: 73,544
- cache_read: 3,770,059
- output: 22,574

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 41 msgs (100%), $1.9110 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Bash: 17 (1 failed)
- Read: 4
- Agent: 3

## Tool Result Sizes (bytes)

- count: 25
- sum: 73,581
- p50: 657
- p90: 15,023
- max: 18,969

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\auto-walker.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 4 calls, 52,126B results, ~31,540 cache_create tok (0.61×)
- Agent: 3 calls, 4,451B results, ~20,604 cache_create tok (4.63×)
- Bash: 17 calls, 9,539B results, ~14,146 cache_create tok (1.48×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 41
- usd: $1.9110
- input: 47
- cache_create_5m: 0
- cache_create_1h: 73,544
- cache_read: 3,770,059
- output: 22,574

