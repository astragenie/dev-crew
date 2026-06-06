---
kind: cost-report
slice: SLICE-57
run_title: "orchestrate-slice: SLICE-57 configurable grade-trend + autoMode warn-alert demotion"
usd: 44.3296
duration_ms: 819947
total_tokens: 27437215
cache_hit_pct: 99.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-06T15:12:03.475Z
---

# Cost Report: orchestrate-slice: SLICE-57 configurable grade-trend + autoMode warn-alert demotion

- Created: 2026-06-06T15:12:03.475Z
- Run Title: orchestrate-slice: SLICE-57 configurable grade-trend + autoMode warn-alert demotion
- Window Start: 2026-06-06T14:58:23.243Z
- Window End: 2026-06-06T15:12:03.190Z
- Duration: 13.7 min (819947 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 44
- Total Tokens: 27,437,215
- Cache Hit %: 99.8%
- Total USD: $44.3296
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-57
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 54
- cache_create_5m: 0
- cache_create_1h: 46,983
- cache_read: 27,365,225
- output: 24,953

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 44 msgs (100%), $44.3296 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 18
- Read: 5
- Edit: 3
- Agent: 1

## Tool Result Sizes (bytes)

- count: 28
- sum: 10,927
- p50: 215
- p90: 1,210
- max: 2,105

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 3× C:\work\mega\loop\src\scripts\lib\stop-conditions.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 18 calls, 3,700B results, ~18,408 cache_create tok (4.98×)
- Agent: 1 calls, 298B results, ~14,056 cache_create tok (47.17×)
- Edit: 3 calls, 486B results, ~7,012 cache_create tok (14.43×)
- Read: 5 calls, 5,924B results, ~6,412 cache_create tok (1.08×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 44
- usd: $44.3296
- input: 54
- cache_create_5m: 0
- cache_create_1h: 46,983
- cache_read: 27,365,225
- output: 24,953

