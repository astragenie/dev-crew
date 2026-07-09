---
kind: cost-report
feature: FEAT-242
run_title: "FEAT242 SLICE143"
usd: 9.8538
duration_ms: 3074646
total_tokens: 19189240
cache_hit_pct: 98.3
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-09T20:04:37.075Z
---

# Cost Report: FEAT242 SLICE143

- Created: 2026-07-09T20:04:37.076Z
- Run Title: FEAT242 SLICE143
- Window Start: 2026-07-09T19:13:15.281Z
- Window End: 2026-07-09T20:04:29.927Z
- Duration: 51.2 min (3074646 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 131
- Total Tokens: 19,189,240
- Cache Hit %: 98.3%
- Total USD: $9.8538
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 45,131
- cache_create_5m: 40,624
- cache_create_1h: 233,821
- cache_read: 18,770,809
- output: 98,855

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 125 msgs (95.42%), $8.5425 (86.69%)
- claude-opus-4-7 (priced as claude-opus-4): 6 msgs (4.58%), $1.3113 (13.31%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 4313
- turns_before_first_tool: 1
- compaction_count: 2
- skill_invocations: 2
- subagent_dispatches: 5

## Tool Usage

- Bash: 41
- Read: 8 (1 failed)
- Agent: 5
- Edit: 3
- Skill: 2
- StructuredOutput: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 61
- sum: 122,753
- p50: 583
- p90: 4,779
- max: 26,471

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 40 calls, 29,933B results, ~102,242 cache_create tok (3.42×)
- Read: 8 calls, 62,897B results, ~76,637 cache_create tok (1.22×)
- Agent: 5 calls, 16,554B results, ~39,891 cache_create tok (2.41×)
- Edit: 3 calls, 557B results, ~19,022 cache_create tok (34.15×)
- Skill: 2 calls, 59B results, ~15,452 cache_create tok (261.9×)
- Write: 1 calls, 232B results, ~814 cache_create tok (3.51×)
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
- messages: 125
- usd: $8.5425
- input: 45,115
- cache_create_5m: 0
- cache_create_1h: 233,821
- cache_read: 18,552,162
- output: 95,903

