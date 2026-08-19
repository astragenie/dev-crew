---
kind: cost-report
feature: FEAT-002
run_title: "FEAT002 SLICE08"
usd: 2.4123
duration_ms: 920114
total_tokens: 6799240
cache_hit_pct: 99.5
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T00:39:34.574Z
---

# Cost Report: FEAT002 SLICE08

- Created: 2026-08-19T00:39:34.574Z
- Run Title: FEAT002 SLICE08
- Window Start: 2026-08-19T00:24:10.407Z
- Window End: 2026-08-19T00:39:30.521Z
- Duration: 15.3 min (920114 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 14
- Total Tokens: 6,799,240
- Cache Hit %: 99.5%
- Total USD: $2.4123
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 28
- cache_create_5m: 0
- cache_create_1h: 37,180
- cache_read: 6,751,113
- output: 10,919

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 14 msgs (100%), $2.4123 (100%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 2520
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Agent: 2
- Bash: 1

## Tool Result Sizes (bytes)

- count: 3
- sum: 6,051
- p50: 315
- p90: 5,423
- max: 5,423

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 628B results, ~25,909 cache_create tok (41.26×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 14
- usd: $2.4123
- input: 28
- cache_create_5m: 0
- cache_create_1h: 37,180
- cache_read: 6,751,113
- output: 10,919

