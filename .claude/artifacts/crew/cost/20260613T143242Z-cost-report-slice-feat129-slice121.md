---
kind: cost-report
feature: FEAT-129
run_title: "FEAT129 SLICE121"
usd: 6.6921
duration_ms: 1039411
total_tokens: 9724964
cache_hit_pct: 95.6
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T14:32:42.970Z
---

# Cost Report: FEAT129 SLICE121

- Created: 2026-06-13T14:32:42.970Z
- Run Title: FEAT129 SLICE121
- Window Start: 2026-06-13T14:15:23.014Z
- Window End: 2026-06-13T14:32:42.425Z
- Duration: 17.3 min (1039411 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 121
- Total Tokens: 9,724,964
- Cache Hit %: 95.6%
- Total USD: $6.6921
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 229
- cache_create_5m: 0
- cache_create_1h: 420,642
- cache_read: 9,210,468
- output: 93,625

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 121 msgs (100%), $6.6921 (100%)

## Conversation Shape

- user_msg_count: 9
- user_msg_avg_len: 3033
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 14

## Tool Usage

- Bash: 20 (1 failed)
- Agent: 14
- TaskUpdate: 13
- Read: 10
- Edit: 5
- TaskCreate: 4
- ToolSearch: 2

## Tool Result Sizes (bytes)

- count: 68
- sum: 29,199
- p50: 190
- p90: 874
- max: 2,872

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 4× C:\work\mega\.-FEAT-178-0\src\scripts\loop.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 20 calls, 9,399B results, ~181,269 cache_create tok (19.29×)
- Agent: 14 calls, 12,236B results, ~157,234 cache_create tok (12.85×)
- TaskUpdate: 13 calls, 308B results, ~27,933 cache_create tok (90.69×)
- Read: 10 calls, 5,852B results, ~26,015 cache_create tok (4.45×)
- ToolSearch: 2 calls, 252B results, ~12,437 cache_create tok (49.35×)
- Edit: 5 calls, 792B results, ~10,758 cache_create tok (13.58×)
- TaskCreate: 4 calls, 360B results, ~3,373 cache_create tok (9.37×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 121
- usd: $6.6921
- input: 229
- cache_create_5m: 0
- cache_create_1h: 420,642
- cache_read: 9,210,468
- output: 93,625

