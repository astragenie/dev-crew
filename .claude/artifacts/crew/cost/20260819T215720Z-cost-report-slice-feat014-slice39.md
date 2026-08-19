---
kind: cost-report
feature: FEAT-014
run_title: "FEAT014 SLICE39"
usd: 4.8854
duration_ms: 346375
total_tokens: 15158492
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T21:57:20.082Z
---

# Cost Report: FEAT014 SLICE39

- Created: 2026-08-19T21:57:20.082Z
- Run Title: FEAT014 SLICE39
- Window Start: 2026-08-19T21:51:30.175Z
- Window End: 2026-08-19T21:57:16.550Z
- Duration: 5.8 min (346375 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 28
- Total Tokens: 15,158,492
- Cache Hit %: 99.8%
- Total USD: $4.8854
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 56
- cache_create_5m: 0
- cache_create_1h: 24,424
- cache_read: 15,120,508
- output: 13,504

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 28 msgs (100%), $4.8854 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 1220
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 12
- Read: 2
- Agent: 1
- SendMessage: 1

## Tool Result Sizes (bytes)

- count: 16
- sum: 5,850
- p50: 194
- p90: 1,513
- max: 1,754

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 11 calls, 4,961B results, ~17,557 cache_create tok (3.54×)
- Agent: 1 calls, 313B results, ~2,311 cache_create tok (7.38×)
- Read: 2 calls, 140B results, ~2,009 cache_create tok (14.35×)
- SendMessage: 1 calls, 370B results, ~679 cache_create tok (1.84×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 28
- usd: $4.8854
- input: 56
- cache_create_5m: 0
- cache_create_1h: 24,424
- cache_read: 15,120,508
- output: 13,504

