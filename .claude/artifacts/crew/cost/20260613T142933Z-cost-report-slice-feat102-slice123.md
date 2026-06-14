---
kind: cost-report
feature: FEAT-102
run_title: "FEAT102 SLICE123"
usd: 4.5762
duration_ms: 797156
total_tokens: 5775521
cache_hit_pct: 93.6
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T14:29:33.432Z
---

# Cost Report: FEAT102 SLICE123

- Created: 2026-06-13T14:29:33.432Z
- Run Title: FEAT102 SLICE123
- Window Start: 2026-06-13T14:16:15.735Z
- Window End: 2026-06-13T14:29:32.891Z
- Duration: 13.3 min (797156 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 82
- Total Tokens: 5,775,521
- Cache Hit %: 93.6%
- Total USD: $4.5762
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 190
- cache_create_5m: 0
- cache_create_1h: 367,320
- cache_read: 5,357,038
- output: 50,973

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 82 msgs (100%), $4.5762 (100%)

## Conversation Shape

- user_msg_count: 9
- user_msg_avg_len: 3033
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 9

## Tool Usage

- TaskUpdate: 13
- Agent: 9
- Read: 7
- Bash: 6
- TaskCreate: 4
- Edit: 3
- ToolSearch: 2

## Tool Result Sizes (bytes)

- count: 44
- sum: 15,092
- p50: 149
- p90: 874
- max: 1,054

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 6 calls, 3,230B results, ~145,292 cache_create tok (44.98×)
- Agent: 9 calls, 7,866B results, ~85,027 cache_create tok (10.81×)
- TaskUpdate: 13 calls, 308B results, ~27,933 cache_create tok (90.69×)
- Read: 7 calls, 2,588B results, ~18,060 cache_create tok (6.98×)
- ToolSearch: 2 calls, 252B results, ~12,437 cache_create tok (49.35×)
- Edit: 3 calls, 488B results, ~5,662 cache_create tok (11.6×)
- TaskCreate: 4 calls, 360B results, ~3,373 cache_create tok (9.37×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 82
- usd: $4.5762
- input: 190
- cache_create_5m: 0
- cache_create_1h: 367,320
- cache_read: 5,357,038
- output: 50,973

