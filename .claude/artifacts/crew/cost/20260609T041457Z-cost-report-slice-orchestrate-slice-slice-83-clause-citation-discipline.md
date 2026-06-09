---
kind: cost-report
slice: SLICE-83
run_title: "orchestrate-slice SLICE-83 clause-citation discipline"
usd: 15.1885
duration_ms: 1106358
total_tokens: 10690794
cache_hit_pct: 99.3
validation_decision: passed
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-09T04:14:57.455Z
---

# Cost Report: orchestrate-slice SLICE-83 clause-citation discipline

- Created: 2026-06-09T04:14:57.455Z
- Run Title: orchestrate-slice SLICE-83 clause-citation discipline
- Window Start: 2026-06-09T03:56:30.419Z
- Window End: 2026-06-09T04:14:56.777Z
- Duration: 18.4 min (1106358 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 62
- Total Tokens: 10,690,794
- Cache Hit %: 99.3%
- Total USD: $15.1885
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-83
- Grade Avg: -
- Review Decision: -
- Validation Decision: passed

## Tokens (totals)

- input: 176
- cache_create_5m: 0
- cache_create_1h: 72,051
- cache_read: 10,570,967
- output: 47,600

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 32 msgs (51.61%), $13.5880 (89.46%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 30 msgs (48.39%), $1.6005 (10.54%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 25
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 9

## Tool Usage

- Bash: 19 (1 failed)
- Agent: 9
- Glob: 2
- Grep: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 33
- sum: 33,910
- p50: 618
- p90: 2,727
- max: 4,691

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 19 calls, 19,784B results, ~33,865 cache_create tok (1.71×)
- Agent: 9 calls, 11,121B results, ~28,660 cache_create tok (2.58×)
- Glob: 2 calls, 28B results, ~3,730 cache_create tok (133.21×)
- Grep: 1 calls, 490B results, ~1,960 cache_create tok (4×)
- Write: 1 calls, 209B results, ~1,870 cache_create tok (8.95×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 30
- usd: $1.6005
- input: 56
- cache_create_5m: 0
- cache_create_1h: 27,724
- cache_read: 3,704,619
- output: 21,509

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 32
- usd: $13.5880
- input: 120
- cache_create_5m: 0
- cache_create_1h: 44,327
- cache_read: 6,866,348
- output: 26,091

