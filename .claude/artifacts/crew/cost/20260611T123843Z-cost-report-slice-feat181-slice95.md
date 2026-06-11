---
kind: cost-report
feature: FEAT-181
run_title: "FEAT181 SLICE95"
usd: 15.8649
duration_ms: 782400
total_tokens: 9305862
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-11T12:38:43.821Z
---

# Cost Report: FEAT181 SLICE95

- Created: 2026-06-11T12:38:43.821Z
- Run Title: FEAT181 SLICE95
- Window Start: 2026-06-11T12:25:41.069Z
- Window End: 2026-06-11T12:38:43.469Z
- Duration: 13.0 min (782400 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 17
- Total Tokens: 9,305,862
- Cache Hit %: 99.7%
- Total USD: $15.8649
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 27
- cache_create_5m: 0
- cache_create_1h: 25,576
- cache_read: 9,264,248
- output: 16,011

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 17 msgs (100%), $15.8649 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- PowerShell: 6
- Agent: 2

## Tool Result Sizes (bytes)

- count: 9
- sum: 6,678
- p50: 786
- p90: 1,671
- max: 1,671

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 2,685B results, ~14,702 cache_create tok (5.48×)
- PowerShell: 6 calls, 3,821B results, ~10,629 cache_create tok (2.78×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 17
- usd: $15.8649
- input: 27
- cache_create_5m: 0
- cache_create_1h: 25,576
- cache_read: 9,264,248
- output: 16,011

