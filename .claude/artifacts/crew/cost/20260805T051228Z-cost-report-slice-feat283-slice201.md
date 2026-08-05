---
kind: cost-report
feature: FEAT-283
run_title: "FEAT283 SLICE201"
usd: 2.011
duration_ms: 185948
total_tokens: 4827950
cache_hit_pct: 99.3
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-05T05:12:28.136Z
---

# Cost Report: FEAT283 SLICE201

- Created: 2026-08-05T05:12:28.136Z
- Run Title: FEAT283 SLICE201
- Window Start: 2026-08-05T05:09:20.933Z
- Window End: 2026-08-05T05:12:26.881Z
- Duration: 3.1 min (185948 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 19
- Total Tokens: 4,827,950
- Cache Hit %: 99.3%
- Total USD: $2.0110
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 38
- cache_create_5m: 0
- cache_create_1h: 31,440
- cache_read: 4,770,394
- output: 26,078

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 19 msgs (100%), $2.0110 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 3
- Read: 2
- Edit: 2
- Agent: 1

## Tool Result Sizes (bytes)

- count: 9
- sum: 5,552
- p50: 305
- p90: 1,608
- max: 1,608

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\runner-plugin\src\scripts\lib\slice-linker\feature-lifecycle.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Edit: 2 calls, 504B results, ~12,127 cache_create tok (24.06×)
- Agent: 1 calls, 305B results, ~6,315 cache_create tok (20.7×)
- Bash: 3 calls, 1,350B results, ~6,193 cache_create tok (4.59×)
- Read: 2 calls, 3,162B results, ~5,892 cache_create tok (1.86×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 19
- usd: $2.0110
- input: 38
- cache_create_5m: 0
- cache_create_1h: 31,440
- cache_read: 4,770,394
- output: 26,078

