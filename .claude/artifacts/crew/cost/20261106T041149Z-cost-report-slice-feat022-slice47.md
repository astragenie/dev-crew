---
kind: cost-report
feature: FEAT-022
run_title: "FEAT022 SLICE47"
usd: 5.0713
duration_ms: 1007102
total_tokens: 20872624
cache_hit_pct: 99.8
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
created_at: 2026-11-06T04:11:49.014Z
---

# Cost Report: FEAT022 SLICE47

- Created: 2026-11-06T04:11:49.014Z
- Run Title: FEAT022 SLICE47
- Window Start: 2026-11-06T03:55:01.810Z
- Window End: 2026-11-06T04:11:48.912Z
- Duration: 16.8 min (1007102 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 36
- Total Tokens: 20,872,624
- Cache Hit %: 99.8%
- Total USD: $5.0713
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 72
- cache_create_5m: 0
- cache_create_1h: 43,798
- cache_read: 20,800,732
- output: 28,022

## Model Mix

- claude-opus-5 (priced as claude-opus-5): 36 msgs (100%), $5.0713 (100%)

## Conversation Shape

- user_msg_count: 6
- user_msg_avg_len: 3410
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 11
- Agent: 4
- Edit: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 18
- sum: 8,213
- p50: 293
- p90: 994
- max: 1,963

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 4 calls, 1,172B results, ~20,036 cache_create tok (17.1×)
- Bash: 10 calls, 6,096B results, ~19,996 cache_create tok (3.28×)
- Edit: 2 calls, 284B results, ~1,496 cache_create tok (5.27×)
- Write: 1 calls, 220B results, ~1,268 cache_create tok (5.76×)


## By Model (token detail)

### claude-opus-5 (priced as claude-opus-5)
- messages: 36
- usd: $5.0713
- input: 72
- cache_create_5m: 0
- cache_create_1h: 43,798
- cache_read: 20,800,732
- output: 28,022

