---
kind: cost-report
feature: FEAT-180
run_title: "FEAT180 SLICE115"
usd: 3.846
duration_ms: 1802350
total_tokens: 7909088
cache_hit_pct: 98.6
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T09:22:51.674Z
---

# Cost Report: FEAT180 SLICE115

- Created: 2026-06-13T09:22:51.674Z
- Run Title: FEAT180 SLICE115
- Window Start: 2026-06-13T08:52:48.870Z
- Window End: 2026-06-13T09:22:51.220Z
- Duration: 30.0 min (1802350 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 54
- Total Tokens: 7,909,088
- Cache Hit %: 98.6%
- Total USD: $3.8460
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 72
- cache_create_5m: 0
- cache_create_1h: 106,399
- cache_read: 7,743,662
- output: 58,955

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 54 msgs (100%), $3.8460 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 395
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 10

## Tool Usage

- Bash: 19
- Agent: 10
- Edit: 3
- Read: 2

## Tool Result Sizes (bytes)

- count: 34
- sum: 43,892
- p50: 540
- p90: 2,528
- max: 7,266

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 10 calls, 16,049B results, ~55,010 cache_create tok (3.43×)
- Bash: 18 calls, 15,294B results, ~31,517 cache_create tok (2.06×)
- Read: 2 calls, 10,654B results, ~11,562 cache_create tok (1.09×)
- Edit: 3 calls, 499B results, ~6,866 cache_create tok (13.76×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 54
- usd: $3.8460
- input: 72
- cache_create_5m: 0
- cache_create_1h: 106,399
- cache_read: 7,743,662
- output: 58,955

