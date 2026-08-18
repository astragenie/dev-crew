---
kind: cost-report
feature: FEAT-002
run_title: "FEAT002 SLICE04"
usd: 2.7201
duration_ms: 1560712
total_tokens: 7144766
cache_hit_pct: 99.5
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-18T22:24:14.523Z
---

# Cost Report: FEAT002 SLICE04

- Created: 2026-08-18T22:24:14.523Z
- Run Title: FEAT002 SLICE04
- Window Start: 2026-08-18T21:58:07.687Z
- Window End: 2026-08-18T22:24:08.399Z
- Duration: 26.0 min (1560712 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 20
- Total Tokens: 7,144,766
- Cache Hit %: 99.5%
- Total USD: $2.7201
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 40
- cache_create_5m: 0
- cache_create_1h: 36,131
- cache_read: 7,083,380
- output: 25,215

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 20 msgs (100%), $2.7201 (100%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 1788
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Agent: 2
- Bash: 2
- Read: 1

## Tool Result Sizes (bytes)

- count: 5
- sum: 13,368
- p50: 1,026
- p90: 7,444
- max: 7,444

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 628B results, ~16,712 cache_create tok (26.61×)
- Read: 1 calls, 4,270B results, ~6,051 cache_create tok (1.42×)
- Bash: 1 calls, 1,026B results, ~2,733 cache_create tok (2.66×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 20
- usd: $2.7201
- input: 40
- cache_create_5m: 0
- cache_create_1h: 36,131
- cache_read: 7,083,380
- output: 25,215

