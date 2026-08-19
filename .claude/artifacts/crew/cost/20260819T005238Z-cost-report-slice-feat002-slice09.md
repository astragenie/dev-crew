---
kind: cost-report
feature: FEAT-002
run_title: "FEAT002 SLICE09"
usd: 1.8489
duration_ms: 722072
total_tokens: 5512416
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T00:52:38.237Z
---

# Cost Report: FEAT002 SLICE09

- Created: 2026-08-19T00:52:38.237Z
- Run Title: FEAT002 SLICE09
- Window Start: 2026-08-19T00:40:33.000Z
- Window End: 2026-08-19T00:52:35.072Z
- Duration: 12.0 min (722072 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 11
- Total Tokens: 5,512,416
- Cache Hit %: 99.7%
- Total USD: $1.8489
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 22
- cache_create_5m: 0
- cache_create_1h: 14,998
- cache_read: 5,489,937
- output: 7,459

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 11 msgs (100%), $1.8489 (100%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 2379
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Agent: 2
- Bash: 1

## Tool Result Sizes (bytes)

- count: 3
- sum: 694
- p50: 313
- p90: 315
- max: 315

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 628B results, ~14,016 cache_create tok (22.32×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 11
- usd: $1.8489
- input: 22
- cache_create_5m: 0
- cache_create_1h: 14,998
- cache_read: 5,489,937
- output: 7,459

