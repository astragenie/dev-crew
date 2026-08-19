---
kind: cost-report
feature: FEAT-019
run_title: "FEAT019 SLICE38"
usd: 1.0139
duration_ms: 34423
total_tokens: 3216633
cache_hit_pct: 99.9
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T21:52:07.781Z
---

# Cost Report: FEAT019 SLICE38

- Created: 2026-08-19T21:52:07.781Z
- Run Title: FEAT019 SLICE38
- Window Start: 2026-08-19T21:51:30.175Z
- Window End: 2026-08-19T21:52:04.598Z
- Duration: 0.6 min (34423 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 6
- Total Tokens: 3,216,633
- Cache Hit %: 99.9%
- Total USD: $1.0139
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 12
- cache_create_5m: 0
- cache_create_1h: 3,529
- cache_read: 3,211,138
- output: 1,954

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 6 msgs (100%), $1.0139 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 3

## Tool Result Sizes (bytes)

- count: 3
- sum: 326
- p50: 66
- p90: 229
- max: 229

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 2 calls, 260B results, ~1,661 cache_create tok (6.39×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 6
- usd: $1.0139
- input: 12
- cache_create_5m: 0
- cache_create_1h: 3,529
- cache_read: 3,211,138
- output: 1,954

