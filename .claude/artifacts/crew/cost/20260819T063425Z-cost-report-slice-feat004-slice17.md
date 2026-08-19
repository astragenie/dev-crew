---
kind: cost-report
feature: FEAT-004
run_title: "FEAT004 SLICE17"
usd: 26.848
duration_ms: 12386000
total_tokens: 79305012
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T06:34:25.226Z
---

# Cost Report: FEAT004 SLICE17

- Created: 2026-08-19T06:34:25.226Z
- Run Title: FEAT004 SLICE17
- Window Start: 2026-08-19T03:07:55.529Z
- Window End: 2026-08-19T06:34:21.529Z
- Duration: 206.4 min (12386000 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 125
- Total Tokens: 79,305,012
- Cache Hit %: 99.7%
- Total USD: $26.8480
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 250
- cache_create_5m: 0
- cache_create_1h: 205,975
- cache_read: 78,970,777
- output: 128,010

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 125 msgs (100%), $26.8480 (100%)

## Conversation Shape

- user_msg_count: 35
- user_msg_avg_len: 2190
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 10

## Tool Usage

- Bash: 15
- Agent: 10
- SendMessage: 4
- Workflow: 4

## Tool Result Sizes (bytes)

- count: 33
- sum: 16,404
- p50: 321
- p90: 1,243
- max: 2,642

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Workflow: 4 calls, 4,967B results, ~69,425 cache_create tok (13.98×)
- Bash: 14 calls, 6,188B results, ~61,061 cache_create tok (9.87×)
- Agent: 10 calls, 3,168B results, ~57,262 cache_create tok (18.08×)
- SendMessage: 4 calls, 1,504B results, ~16,100 cache_create tok (10.7×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 125
- usd: $26.8480
- input: 250
- cache_create_5m: 0
- cache_create_1h: 205,975
- cache_read: 78,970,777
- output: 128,010

