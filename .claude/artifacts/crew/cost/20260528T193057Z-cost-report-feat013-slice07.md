---
kind: cost-report
feature: FEAT-013
run_title: "FEAT013 SLICE07"
usd: 0.3143
duration_ms: 291203
total_tokens: 727779
cache_hit_pct: 98.7
source_project: C--work-mega-hero-crew-autonomous-loop
source_count: 1
created_at: 2026-05-28T19:30:57.950Z
---

# Cost Report: FEAT013 SLICE07

- Created: 2026-05-28T19:30:57.950Z
- Run Title: FEAT013 SLICE07
- Window Start: 2026-05-28T19:26:06.591Z
- Window End: 2026-05-28T19:30:57.794Z
- Duration: 4.9 min (291203 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 5
- Total Tokens: 727,779
- Cache Hit %: 98.7%
- Total USD: $0.3143
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 11
- cache_create_5m: 0
- cache_create_1h: 9,634
- cache_read: 715,344
- output: 2,790

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 5 msgs (100%), $0.3143 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 2
- Agent: 1

## Tool Result Sizes (bytes)

- count: 4
- sum: 2,903
- p50: 578
- p90: 1,351
- max: 1,351

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 1,351B results, ~8,598 cache_create tok (6.36×)
- Bash: 2 calls, 1,153B results, ~734 cache_create tok (0.64×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 5
- usd: $0.3143
- input: 11
- cache_create_5m: 0
- cache_create_1h: 9,634
- cache_read: 715,344
- output: 2,790

