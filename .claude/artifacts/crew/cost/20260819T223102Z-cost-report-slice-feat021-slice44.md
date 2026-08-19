---
kind: cost-report
feature: FEAT-021
run_title: "FEAT021 SLICE44"
usd: 3.0032
duration_ms: 757769
total_tokens: 9233904
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T22:31:02.108Z
---

# Cost Report: FEAT021 SLICE44

- Created: 2026-08-19T22:31:02.108Z
- Run Title: FEAT021 SLICE44
- Window Start: 2026-08-19T22:18:21.184Z
- Window End: 2026-08-19T22:30:58.953Z
- Duration: 12.6 min (757769 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 16
- Total Tokens: 9,233,904
- Cache Hit %: 99.8%
- Total USD: $3.0032
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 32
- cache_create_5m: 0
- cache_create_1h: 21,800
- cache_read: 9,204,678
- output: 7,394

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 16 msgs (100%), $3.0032 (100%)

## Conversation Shape

- user_msg_count: 6
- user_msg_avg_len: 1835
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Agent: 2
- Bash: 2
- SendMessage: 2
- Read: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 8
- sum: 2,174
- p50: 313
- p90: 388
- max: 388

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 2 calls, 764B results, ~8,973 cache_create tok (11.74×)
- Agent: 2 calls, 626B results, ~5,819 cache_create tok (9.3×)
- Bash: 1 calls, 352B results, ~3,962 cache_create tok (11.26×)
- Write: 1 calls, 230B results, ~1,972 cache_create tok (8.57×)
- Read: 1 calls, 119B results, ~485 cache_create tok (4.08×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 16
- usd: $3.0032
- input: 32
- cache_create_5m: 0
- cache_create_1h: 21,800
- cache_read: 9,204,678
- output: 7,394

