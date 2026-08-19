---
kind: cost-report
feature: FEAT-003
run_title: "FEAT003 SLICE13"
usd: 0.769
duration_ms: 25713
total_tokens: 2299404
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T03:04:59.473Z
---

# Cost Report: FEAT003 SLICE13

- Created: 2026-08-19T03:04:59.473Z
- Run Title: FEAT003 SLICE13
- Window Start: 2026-08-19T03:04:30.398Z
- Window End: 2026-08-19T03:04:56.111Z
- Duration: 0.4 min (25713 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 4
- Total Tokens: 2,299,404
- Cache Hit %: 99.6%
- Total USD: $0.7690
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 8
- cache_create_5m: 0
- cache_create_1h: 9,584
- cache_read: 2,288,142
- output: 1,670

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 4 msgs (100%), $0.7690 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 2

## Tool Result Sizes (bytes)

- count: 2
- sum: 1,390
- p50: 956
- p90: 956
- max: 956

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1 calls, 434B results, ~662 cache_create tok (1.53×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 4
- usd: $0.7690
- input: 8
- cache_create_5m: 0
- cache_create_1h: 9,584
- cache_read: 2,288,142
- output: 1,670

