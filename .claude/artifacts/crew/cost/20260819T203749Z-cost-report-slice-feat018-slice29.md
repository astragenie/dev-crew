---
kind: cost-report
feature: FEAT-018
run_title: "FEAT018 SLICE29"
usd: 1.6894
duration_ms: 137266
total_tokens: 4887097
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T20:37:49.199Z
---

# Cost Report: FEAT018 SLICE29

- Created: 2026-08-19T20:37:49.199Z
- Run Title: FEAT018 SLICE29
- Window Start: 2026-08-19T20:35:28.489Z
- Window End: 2026-08-19T20:37:45.755Z
- Duration: 2.3 min (137266 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 12
- Total Tokens: 4,887,097
- Cache Hit %: 99.6%
- Total USD: $1.6894
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 24
- cache_create_5m: 0
- cache_create_1h: 17,302
- cache_read: 4,861,295
- output: 8,476

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 12 msgs (100%), $1.6894 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 4227
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Agent: 2
- TaskUpdate: 2
- SendMessage: 1
- Write: 1
- Bash: 1

## Tool Result Sizes (bytes)

- count: 7
- sum: 1,397
- p50: 230
- p90: 401
- max: 401

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 1 calls, 401B results, ~10,765 cache_create tok (26.85×)
- Agent: 2 calls, 626B results, ~3,630 cache_create tok (5.8×)
- TaskUpdate: 2 calls, 57B results, ~1,289 cache_create tok (22.61×)
- Write: 1 calls, 230B results, ~679 cache_create tok (2.95×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 12
- usd: $1.6894
- input: 24
- cache_create_5m: 0
- cache_create_1h: 17,302
- cache_read: 4,861,295
- output: 8,476

