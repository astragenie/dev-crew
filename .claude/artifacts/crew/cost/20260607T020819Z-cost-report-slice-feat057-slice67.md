---
kind: cost-report
feature: FEAT-057
run_title: "FEAT057 SLICE67"
usd: 30.576
duration_ms: 332441
total_tokens: 18273385
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T02:08:19.135Z
---

# Cost Report: FEAT057 SLICE67

- Created: 2026-06-07T02:08:19.135Z
- Run Title: FEAT057 SLICE67
- Window Start: 2026-06-07T02:02:20.665Z
- Window End: 2026-06-07T02:07:53.106Z
- Duration: 5.5 min (332441 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 41
- Total Tokens: 18,273,385
- Cache Hit %: 99.7%
- Total USD: $30.5760
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 41
- cache_create_5m: 0
- cache_create_1h: 51,391
- cache_read: 18,198,814
- output: 23,139

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 41 msgs (100%), $30.5760 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 12
- Edit: 12
- Read: 5
- Write: 2

## Tool Result Sizes (bytes)

- count: 31
- sum: 24,581
- p50: 185
- p90: 1,861
- max: 6,143

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 3× C:\work\mega\loop\src\scripts\lib\stop-conditions.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 11 calls, 7,896B results, ~19,368 cache_create tok (2.45×)
- Edit: 12 calls, 1,882B results, ~14,944 cache_create tok (7.94×)
- Write: 2 calls, 313B results, ~9,172 cache_create tok (29.3×)
- Read: 5 calls, 14,068B results, ~7,101 cache_create tok (0.5×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 41
- usd: $30.5760
- input: 41
- cache_create_5m: 0
- cache_create_1h: 51,391
- cache_read: 18,198,814
- output: 23,139

