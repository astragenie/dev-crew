---
kind: cost-report
feature: FEAT-275
run_title: "FEAT275 SLICE178"
usd: 0.0927
duration_ms: 22454
total_tokens: 244042
cache_hit_pct: 99.3
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T15:58:03.714Z
---

# Cost Report: FEAT275 SLICE178

- Created: 2026-08-04T15:58:03.714Z
- Run Title: FEAT275 SLICE178
- Window Start: 2026-08-04T15:57:40.374Z
- Window End: 2026-08-04T15:58:02.828Z
- Duration: 0.4 min (22454 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 2
- Total Tokens: 244,042
- Cache Hit %: 99.3%
- Total USD: $0.0927
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 4
- cache_create_5m: 0
- cache_create_1h: 1,788
- cache_read: 241,616
- output: 634

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 2 msgs (100%), $0.0927 (99.96%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 1

## Tool Result Sizes (bytes)

- count: 2
- sum: 2,936
- p50: 1,732
- p90: 1,732
- max: 1,732

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1 calls, 1,204B results, ~0 cache_create tok (0×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 2
- usd: $0.0927
- input: 4
- cache_create_5m: 0
- cache_create_1h: 1,788
- cache_read: 241,616
- output: 634

