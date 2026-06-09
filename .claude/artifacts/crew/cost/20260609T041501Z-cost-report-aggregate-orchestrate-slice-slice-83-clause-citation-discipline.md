---
kind: cost-report
slice: SLICE-83
run_title: "orchestrate-slice SLICE-83 clause-citation discipline"
usd: 41.3887
duration_ms: 1106358
total_tokens: 26095515
cache_hit_pct: 99.6
validation_decision: passed
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-09T04:15:01.547Z
---

# Cost Report: orchestrate-slice SLICE-83 clause-citation discipline

- Created: 2026-06-09T04:15:01.547Z
- Run Title: orchestrate-slice SLICE-83 clause-citation discipline
- Window Start: 2026-06-09T03:56:30.419Z
- Window End: 2026-06-09T04:14:56.777Z
- Duration: 18.4 min (1106358 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 112
- Total Tokens: 26,095,515
- Cache Hit %: 99.6%
- Total USD: $41.3887
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-hero-crew: 48 msgs, $25.3521
- C--work-mega-loop: 64 msgs, $16.0366

## Outcome Linkage

- Slice: SLICE-83
- Grade Avg: -
- Review Decision: -
- Validation Decision: passed

## Tokens (totals)

- input: 261
- cache_create_5m: 0
- cache_create_1h: 112,791
- cache_read: 25,908,592
- output: 73,871

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 82 msgs (73.21%), $39.7882 (96.13%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 30 msgs (26.79%), $1.6005 (3.87%)

## Conversation Shape

- user_msg_count: 8
- user_msg_avg_len: 21
- turns_before_first_tool: 4
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 9

## Tool Usage

- Bash: 29 (2 failed)
- Agent: 9
- Write: 7
- Edit: 7
- Read: 5
- Grep: 3
- Glob: 2

## Tool Result Sizes (bytes)

- count: 61
- sum: 47,523
- p50: 262
- p90: 2,158
- max: 4,691

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\hero-crew\scripts\lib\outcome-linkage.ts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 27 calls, 21,898B results, ~44,126 cache_create tok (2.02×)
- Agent: 9 calls, 11,121B results, ~31,334 cache_create tok (2.82×)
- Read: 5 calls, 8,562B results, ~10,274 cache_create tok (1.2×)
- Edit: 7 calls, 1,092B results, ~9,279 cache_create tok (8.5×)
- Write: 7 calls, 1,331B results, ~7,064 cache_create tok (5.31×)
- Glob: 2 calls, 28B results, ~3,730 cache_create tok (133.21×)
- Grep: 3 calls, 1,213B results, ~2,817 cache_create tok (2.32×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 82
- usd: $39.7882
- input: 205
- cache_create_5m: 0
- cache_create_1h: 85,067
- cache_read: 22,203,973
- output: 52,362

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 30
- usd: $1.6005
- input: 56
- cache_create_5m: 0
- cache_create_1h: 27,724
- cache_read: 3,704,619
- output: 21,509

