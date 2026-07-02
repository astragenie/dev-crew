---
kind: cost-report
feature: FEAT-202
run_title: "FEAT202 SLICE135"
usd: 32.4894
duration_ms: 608423
total_tokens: 20231734
cache_hit_pct: 99.9
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-07-01T23:56:34.380Z
---

# Cost Report: FEAT202 SLICE135

- Created: 2026-07-01T23:56:34.380Z
- Run Title: FEAT202 SLICE135
- Window Start: 2026-07-01T23:46:17.602Z
- Window End: 2026-07-01T23:56:26.025Z
- Duration: 10.1 min (608423 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 29
- Total Tokens: 20,231,734
- Cache Hit %: 99.9%
- Total USD: $32.4894
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-runner: 14 msgs, $18.5173
- C--work-mega-astramemory-plugin: 10 msgs, $11.3037
- C--work-mega-runner-plugin: 5 msgs, $2.6684

## Tokens (totals)

- input: 79
- cache_create_5m: 0
- cache_create_1h: 21,743
- cache_read: 20,189,218
- output: 20,694

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 29 msgs (100%), $32.4894 (100%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 285
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 9
- Read: 2
- Agent: 2
- TaskUpdate: 1

## Tool Result Sizes (bytes)

- count: 13
- sum: 5,570
- p50: 199
- p90: 718
- max: 2,608

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 2,608B results, ~10,893 cache_create tok (4.18×)
- Bash: 8 calls, 2,104B results, ~8,236 cache_create tok (3.91×)
- TaskUpdate: 1 calls, 23B results, ~931 cache_create tok (40.48×)
- Read: 2 calls, 685B results, ~703 cache_create tok (1.03×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 29
- usd: $32.4894
- input: 79
- cache_create_5m: 0
- cache_create_1h: 21,743
- cache_read: 20,189,218
- output: 20,694

