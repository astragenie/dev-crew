---
kind: cost-report
feature: FEAT-174
run_title: "FEAT174 SLICE124"
usd: 2.7993
duration_ms: 615172
total_tokens: 3218472
cache_hit_pct: 93.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T15:00:10.206Z
---

# Cost Report: FEAT174 SLICE124

- Created: 2026-06-13T15:00:10.206Z
- Run Title: FEAT174 SLICE124
- Window Start: 2026-06-13T14:49:54.433Z
- Window End: 2026-06-13T15:00:09.605Z
- Duration: 10.3 min (615172 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 39
- Total Tokens: 3,218,472
- Cache Hit %: 93.9%
- Total USD: $2.7993
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 95
- cache_create_5m: 0
- cache_create_1h: 192,729
- cache_read: 2,975,653
- output: 49,995

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 39 msgs (100%), $2.7993 (100%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 6010
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 12

## Tool Usage

- Agent: 12
- Bash: 3
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 17
- sum: 12,970
- p50: 874
- p90: 874
- max: 2,204

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 12 calls, 10,488B results, ~172,980 cache_create tok (16.49×)
- Bash: 3 calls, 226B results, ~9,272 cache_create tok (41.03×)
- ToolSearch: 1 calls, 52B results, ~7,779 cache_create tok (149.6×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 39
- usd: $2.7993
- input: 95
- cache_create_5m: 0
- cache_create_1h: 192,729
- cache_read: 2,975,653
- output: 49,995

