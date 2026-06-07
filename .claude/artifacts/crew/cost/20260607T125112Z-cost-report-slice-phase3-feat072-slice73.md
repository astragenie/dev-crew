---
kind: cost-report
phase: "3"
feature: FEAT-072
run_title: "PHASE3 FEAT072 SLICE73"
usd: 0.8969
duration_ms: 725933
total_tokens: 2400650
cache_hit_pct: 99.5
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T12:51:12.402Z
---

# Cost Report: PHASE3 FEAT072 SLICE73

- Created: 2026-06-07T12:51:12.402Z
- Run Title: PHASE3 FEAT072 SLICE73
- Window Start: 2026-06-07T12:39:06.227Z
- Window End: 2026-06-07T12:51:12.160Z
- Duration: 12.1 min (725933 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 18
- Total Tokens: 2,400,650
- Cache Hit %: 99.5%
- Total USD: $0.8969
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 28
- cache_create_5m: 0
- cache_create_1h: 12,944
- cache_read: 2,380,679
- output: 6,999

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 18 msgs (100%), $0.8969 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 5
- Agent: 2
- Grep: 1
- Read: 1
- Edit: 1

## Tool Result Sizes (bytes)

- count: 11
- sum: 9,834
- p50: 383
- p90: 2,422
- max: 2,809

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 3,662B results, ~7,524 cache_create tok (2.05×)
- Bash: 5 calls, 2,785B results, ~2,505 cache_create tok (0.9×)
- Edit: 1 calls, 152B results, ~371 cache_create tok (2.44×)
- Grep: 1 calls, 430B results, ~351 cache_create tok (0.82×)
- Read: 1 calls, 383B results, ~249 cache_create tok (0.65×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 18
- usd: $0.8969
- input: 28
- cache_create_5m: 0
- cache_create_1h: 12,944
- cache_read: 2,380,679
- output: 6,999

