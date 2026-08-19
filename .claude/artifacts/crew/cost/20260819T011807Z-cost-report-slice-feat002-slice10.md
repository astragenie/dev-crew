---
kind: cost-report
feature: FEAT-002
run_title: "FEAT002 SLICE10"
usd: 3.3571
duration_ms: 1502901
total_tokens: 10240314
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T01:18:07.717Z
---

# Cost Report: FEAT002 SLICE10

- Created: 2026-08-19T01:18:07.717Z
- Run Title: FEAT002 SLICE10
- Window Start: 2026-08-19T00:53:00.579Z
- Window End: 2026-08-19T01:18:03.480Z
- Duration: 25.0 min (1502901 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 20
- Total Tokens: 10,240,314
- Cache Hit %: 99.8%
- Total USD: $3.3571
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 40
- cache_create_5m: 0
- cache_create_1h: 16,880
- cache_read: 10,210,557
- output: 12,837

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 20 msgs (100%), $3.3571 (100%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 533
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 7

## Tool Result Sizes (bytes)

- count: 7
- sum: 2,583
- p50: 359
- p90: 912
- max: 912

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 6 calls, 1,671B results, ~11,768 cache_create tok (7.04×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 20
- usd: $3.3571
- input: 40
- cache_create_5m: 0
- cache_create_1h: 16,880
- cache_read: 10,210,557
- output: 12,837

