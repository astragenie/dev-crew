---
kind: cost-report
feature: FEAT-036
run_title: "FEAT036 SLICE33"
usd: 22.9824
duration_ms: 195696
total_tokens: 13382976
cache_hit_pct: 99.5
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T16:39:22.083Z
---

# Cost Report: FEAT036 SLICE33

- Created: 2026-06-04T16:39:22.083Z
- Run Title: FEAT036 SLICE33
- Window Start: 2026-06-04T16:36:06.344Z
- Window End: 2026-06-04T16:39:22.040Z
- Duration: 3.3 min (195696 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 36
- Total Tokens: 13,382,976
- Cache Hit %: 99.5%
- Total USD: $22.9824
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 46
- cache_create_5m: 0
- cache_create_1h: 62,126
- cache_read: 13,305,338
- output: 15,466

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 36 msgs (100%), $22.9824 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 1400
- turns_before_first_tool: 1
- compaction_count: 1
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 9
- Grep: 6
- Read: 5
- Edit: 4

## Tool Result Sizes (bytes)

- count: 25
- sum: 28,542
- p50: 495
- p90: 2,776
- max: 9,081

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\slice-linker\agent-report-writer.mts
  - 2× C:\work\mega\loop\src\scripts\loop.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 9 calls, 13,741B results, ~26,660 cache_create tok (1.94×)
- Edit: 4 calls, 649B results, ~17,601 cache_create tok (27.12×)
- Read: 5 calls, 9,073B results, ~5,505 cache_create tok (0.61×)
- Grep: 6 calls, 4,646B results, ~3,352 cache_create tok (0.72×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 36
- usd: $22.9824
- input: 46
- cache_create_5m: 0
- cache_create_1h: 62,126
- cache_read: 13,305,338
- output: 15,466

