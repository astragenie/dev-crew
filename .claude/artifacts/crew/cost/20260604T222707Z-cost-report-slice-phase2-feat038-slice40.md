---
kind: cost-report
phase: "2"
feature: FEAT-038
run_title: "PHASE2 FEAT038 SLICE40"
usd: 0.1067
duration_ms: 10308
total_tokens: 327437
cache_hit_pct: 99.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T22:27:07.513Z
---

# Cost Report: PHASE2 FEAT038 SLICE40

- Created: 2026-06-04T22:27:07.513Z
- Run Title: PHASE2 FEAT038 SLICE40
- Window Start: 2026-06-04T22:26:51.292Z
- Window End: 2026-06-04T22:27:01.600Z
- Duration: 0.2 min (10308 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 2
- Total Tokens: 327,437
- Cache Hit %: 99.9%
- Total USD: $0.1067
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 2
- cache_create_5m: 0
- cache_create_1h: 400
- cache_read: 326,615
- output: 420

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 2 msgs (100%), $0.1067 (100.01%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 5
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 2

## Tool Result Sizes (bytes)

- count: 2
- sum: 178
- p50: 150
- p90: 150
- max: 150

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1 calls, 28B results, ~187 cache_create tok (6.68×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 2
- usd: $0.1067
- input: 2
- cache_create_5m: 0
- cache_create_1h: 400
- cache_read: 326,615
- output: 420

