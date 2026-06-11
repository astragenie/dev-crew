---
kind: cost-report
feature: FEAT-186
run_title: "FEAT186 SLICE94"
usd: 18.6546
duration_ms: 1026200
total_tokens: 10249884
cache_hit_pct: 99.5
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-11T12:18:47.850Z
---

# Cost Report: FEAT186 SLICE94

- Created: 2026-06-11T12:18:47.850Z
- Run Title: FEAT186 SLICE94
- Window Start: 2026-06-11T12:01:41.303Z
- Window End: 2026-06-11T12:18:47.503Z
- Duration: 17.1 min (1026200 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 20
- Total Tokens: 10,249,884
- Cache Hit %: 99.5%
- Total USD: $18.6546
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 45
- cache_create_5m: 0
- cache_create_1h: 49,535
- cache_read: 10,174,897
- output: 25,407

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 20 msgs (100%), $18.6546 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- PowerShell: 7
- Agent: 4

## Tool Result Sizes (bytes)

- count: 12
- sum: 9,451
- p50: 357
- p90: 2,092
- max: 2,890

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 4 calls, 4,824B results, ~38,421 cache_create tok (7.96×)
- PowerShell: 7 calls, 4,455B results, ~10,869 cache_create tok (2.44×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 20
- usd: $18.6546
- input: 45
- cache_create_5m: 0
- cache_create_1h: 49,535
- cache_read: 10,174,897
- output: 25,407

