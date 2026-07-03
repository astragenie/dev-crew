---
kind: cost-report
feature: FEAT-202
run_title: "FEAT202 SLICE135"
usd: 1.1238
duration_ms: 608380
total_tokens: 519972
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-01T23:56:26.008Z
---

# Cost Report: FEAT202 SLICE135

- Created: 2026-07-01T23:56:26.008Z
- Run Title: FEAT202 SLICE135
- Window Start: 2026-07-01T23:46:17.602Z
- Window End: 2026-07-01T23:56:25.982Z
- Duration: 10.1 min (608380 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 2
- Total Tokens: 519,972
- Cache Hit %: 99.8%
- Total USD: $1.1238
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 2
- cache_create_5m: 0
- cache_create_1h: 978
- cache_read: 514,694
- output: 4,298

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 2 msgs (100%), $1.1238 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Agent: 1

## Tool Result Sizes (bytes)

- count: 2
- sum: 2,758
- p50: 2,608
- p90: 2,608
- max: 2,608

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 2,608B results, ~0 cache_create tok (0×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 2
- usd: $1.1238
- input: 2
- cache_create_5m: 0
- cache_create_1h: 978
- cache_read: 514,694
- output: 4,298

