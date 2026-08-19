---
kind: cost-report
feature: FEAT-004
run_title: "FEAT004 SLICE19"
usd: 4.3675
duration_ms: 2039785
total_tokens: 13268832
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T07:08:55.066Z
---

# Cost Report: FEAT004 SLICE19

- Created: 2026-08-19T07:08:55.066Z
- Run Title: FEAT004 SLICE19
- Window Start: 2026-08-19T06:34:51.719Z
- Window End: 2026-08-19T07:08:51.504Z
- Duration: 34.0 min (2039785 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 19
- Total Tokens: 13,268,832
- Cache Hit %: 99.8%
- Total USD: $4.3675
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 38
- cache_create_5m: 0
- cache_create_1h: 31,941
- cache_read: 13,222,926
- output: 13,927

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 19 msgs (100%), $4.3675 (100%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 3139
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 3
- Agent: 1
- Workflow: 1
- SendMessage: 1

## Tool Result Sizes (bytes)

- count: 6
- sum: 3,938
- p50: 419
- p90: 1,393
- max: 1,393

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Workflow: 1 calls, 1,223B results, ~16,366 cache_create tok (13.38×)
- Agent: 1 calls, 315B results, ~5,821 cache_create tok (18.48×)
- Bash: 2 calls, 629B results, ~4,730 cache_create tok (7.52×)
- SendMessage: 1 calls, 378B results, ~3,054 cache_create tok (8.08×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 19
- usd: $4.3675
- input: 38
- cache_create_5m: 0
- cache_create_1h: 31,941
- cache_read: 13,222,926
- output: 13,927

