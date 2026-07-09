---
kind: cost-report
feature: FEAT-242
run_title: "FEAT242 SLICE143"
usd: 11.0951
duration_ms: 3192969
total_tokens: 22550812
cache_hit_pct: 98.5
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-09T20:06:28.868Z
---

# Cost Report: FEAT242 SLICE143

- Created: 2026-07-09T20:06:28.868Z
- Run Title: FEAT242 SLICE143
- Window Start: 2026-07-09T19:13:15.281Z
- Window End: 2026-07-09T20:06:28.250Z
- Duration: 53.2 min (3192969 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 149
- Total Tokens: 22,550,812
- Cache Hit %: 98.5%
- Total USD: $11.0951
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 45,425
- cache_create_5m: 40,624
- cache_create_1h: 247,921
- cache_read: 22,107,670
- output: 109,172

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 143 msgs (95.97%), $9.7838 (88.18%)
- claude-opus-4-7 (priced as claude-opus-4): 6 msgs (4.03%), $1.3113 (11.82%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 4313
- turns_before_first_tool: 1
- compaction_count: 2
- skill_invocations: 2
- subagent_dispatches: 5

## Tool Usage

- Bash: 44
- Edit: 10
- Read: 9 (1 failed)
- Agent: 5
- Skill: 2
- Write: 2
- StructuredOutput: 1

## Tool Result Sizes (bytes)

- count: 73
- sum: 130,514
- p50: 425
- p90: 4,779
- max: 26,471

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 43 calls, 31,143B results, ~104,850 cache_create tok (3.37×)
- Read: 9 calls, 67,897B results, ~81,203 cache_create tok (1.2×)
- Agent: 5 calls, 16,554B results, ~39,891 cache_create tok (2.41×)
- Edit: 10 calls, 1,866B results, ~24,959 cache_create tok (13.38×)
- Skill: 2 calls, 59B results, ~15,452 cache_create tok (261.9×)
- Write: 2 calls, 474B results, ~1,803 cache_create tok (3.8×)
- StructuredOutput: 1 calls, 39B results, ~9 cache_create tok (0.23×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 6
- usd: $1.3113
- input: 16
- cache_create_5m: 40,624
- cache_create_1h: 0
- cache_read: 218,647
- output: 2,952

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 143
- usd: $9.7838
- input: 45,409
- cache_create_5m: 0
- cache_create_1h: 247,921
- cache_read: 21,889,023
- output: 106,220

