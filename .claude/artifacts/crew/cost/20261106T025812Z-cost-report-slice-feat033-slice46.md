---
kind: cost-report
feature: FEAT-033
run_title: "FEAT033 SLICE46"
usd: 8.3366
duration_ms: 840472
total_tokens: 23128375
cache_hit_pct: 99.5
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
created_at: 2026-11-06T02:58:12.941Z
---

# Cost Report: FEAT033 SLICE46

- Created: 2026-11-06T02:58:12.941Z
- Run Title: FEAT033 SLICE46
- Window Start: 2026-11-06T02:44:12.386Z
- Window End: 2026-11-06T02:58:12.858Z
- Duration: 14.0 min (840472 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 56
- Total Tokens: 23,128,375
- Cache Hit %: 99.5%
- Total USD: $8.3366
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 1,340
- cache_create_5m: 0
- cache_create_1h: 104,387
- cache_read: 22,968,265
- output: 54,383

## Model Mix

- claude-fable-5-1 (priced as claude-sonnet-4): 56 msgs (100%), $8.3366 (100%)

## Conversation Shape

- user_msg_count: 8
- user_msg_avg_len: 3059
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 14
- Agent: 4
- Write: 1
- Edit: 1
- SendMessage: 1

## Tool Result Sizes (bytes)

- count: 22
- sum: 26,744
- p50: 473
- p90: 2,943
- max: 4,104

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 13 calls, 18,501B results, ~46,801 cache_create tok (2.53×)
- Agent: 4 calls, 1,222B results, ~27,959 cache_create tok (22.88×)
- SendMessage: 1 calls, 373B results, ~8,503 cache_create tok (22.8×)
- Write: 1 calls, 214B results, ~5,741 cache_create tok (26.83×)
- Edit: 1 calls, 163B results, ~578 cache_create tok (3.55×)


## By Model (token detail)

### claude-fable-5-1 (priced as claude-sonnet-4)
- messages: 56
- usd: $8.3366
- input: 1,340
- cache_create_5m: 0
- cache_create_1h: 104,387
- cache_read: 22,968,265
- output: 54,383

