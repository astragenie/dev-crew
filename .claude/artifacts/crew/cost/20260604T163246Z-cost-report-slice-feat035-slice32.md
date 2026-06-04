---
kind: cost-report
feature: FEAT-035
run_title: "FEAT035 SLICE32"
usd: 6.147
duration_ms: 425870
total_tokens: 3399393
cache_hit_pct: 99.3
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T16:32:46.652Z
---

# Cost Report: FEAT035 SLICE32

- Created: 2026-06-04T16:32:46.652Z
- Run Title: FEAT035 SLICE32
- Window Start: 2026-06-04T16:25:40.743Z
- Window End: 2026-06-04T16:32:46.613Z
- Duration: 7.1 min (425870 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 7
- Total Tokens: 3,399,393
- Cache Hit %: 99.3%
- Total USD: $6.1470
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 27
- cache_create_5m: 0
- cache_create_1h: 23,329
- cache_read: 3,370,830
- output: 5,207

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 7 msgs (100%), $6.1470 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 17
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 2
- Agent: 1

## Tool Result Sizes (bytes)

- count: 4
- sum: 3,953
- p50: 454
- p90: 3,137
- max: 3,137

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 2 calls, 3,591B results, ~13,606 cache_create tok (3.79×)
- Agent: 1 calls, 324B results, ~6,852 cache_create tok (21.15×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 7
- usd: $6.1470
- input: 27
- cache_create_5m: 0
- cache_create_1h: 23,329
- cache_read: 3,370,830
- output: 5,207

