---
kind: cost-report
feature: FEAT-094
run_title: "FEAT094 SLICE133"
usd: 3.1041
duration_ms: 1559537
total_tokens: 7219373
cache_hit_pct: 98.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T19:14:41.521Z
---

# Cost Report: FEAT094 SLICE133

- Created: 2026-06-13T19:14:41.521Z
- Run Title: FEAT094 SLICE133
- Window Start: 2026-06-13T18:48:41.410Z
- Window End: 2026-06-13T19:14:40.947Z
- Duration: 26.0 min (1559537 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 57
- Total Tokens: 7,219,373
- Cache Hit %: 98.9%
- Total USD: $3.1041
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 75
- cache_create_5m: 0
- cache_create_1h: 78,569
- cache_read: 7,107,376
- output: 33,353

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 57 msgs (100%), $3.1041 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 2

## Tool Usage

- Bash: 17 (1 failed)
- Read: 9 (1 failed)
- Edit: 2 (1 failed)
- Agent: 2
- Skill: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 33
- sum: 36,230
- p50: 239
- p90: 3,808
- max: 7,771

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 4× C:\work\mega\loop\src\scripts\dispatch.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 17 calls, 13,496B results, ~27,481 cache_create tok (2.04×)
- Read: 9 calls, 14,513B results, ~26,317 cache_create tok (1.81×)
- Agent: 2 calls, 3,016B results, ~16,011 cache_create tok (5.31×)
- Skill: 1 calls, 36B results, ~3,024 cache_create tok (84×)
- Edit: 2 calls, 274B results, ~393 cache_create tok (1.43×)
- Write: 1 calls, 229B results, ~0 cache_create tok (0×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 57
- usd: $3.1041
- input: 75
- cache_create_5m: 0
- cache_create_1h: 78,569
- cache_read: 7,107,376
- output: 33,353

