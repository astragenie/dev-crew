---
kind: cost-report
feature: FEAT-023
run_title: "FEAT023 SLICE48"
usd: 2.1385
duration_ms: 322627
total_tokens: 5900737
cache_hit_pct: 99.7
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
created_at: 2026-11-06T03:15:15.867Z
---

# Cost Report: FEAT023 SLICE48

- Created: 2026-11-06T03:15:15.867Z
- Run Title: FEAT023 SLICE48
- Window Start: 2026-11-06T03:09:53.184Z
- Window End: 2026-11-06T03:15:15.811Z
- Duration: 5.4 min (322627 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 12
- Total Tokens: 5,900,737
- Cache Hit %: 99.7%
- Total USD: $2.1385
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 216
- cache_create_5m: 0
- cache_create_1h: 19,904
- cache_read: 5,863,324
- output: 17,293

## Model Mix

- claude-fable-5-1 (priced as claude-sonnet-4): 12 msgs (100%), $2.1385 (100%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 2479
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Agent: 3
- Bash: 1

## Tool Result Sizes (bytes)

- count: 4
- sum: 1,390
- p50: 293
- p90: 513
- max: 513

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 3 calls, 877B results, ~17,126 cache_create tok (19.53×)


## By Model (token detail)

### claude-fable-5-1 (priced as claude-sonnet-4)
- messages: 12
- usd: $2.1385
- input: 216
- cache_create_5m: 0
- cache_create_1h: 19,904
- cache_read: 5,863,324
- output: 17,293

