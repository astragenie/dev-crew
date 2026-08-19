---
kind: cost-report
feature: FEAT-007
run_title: "FEAT007 SLICE35"
usd: 4.9724
duration_ms: 827787
total_tokens: 15227111
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T21:30:38.358Z
---

# Cost Report: FEAT007 SLICE35

- Created: 2026-08-19T21:30:38.358Z
- Run Title: FEAT007 SLICE35
- Window Start: 2026-08-19T21:16:47.578Z
- Window End: 2026-08-19T21:30:35.365Z
- Duration: 13.8 min (827787 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 31
- Total Tokens: 15,227,111
- Cache Hit %: 99.8%
- Total USD: $4.9724
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 62
- cache_create_5m: 0
- cache_create_1h: 33,282
- cache_read: 15,179,181
- output: 14,586

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 31 msgs (100%), $4.9724 (100%)

## Conversation Shape

- user_msg_count: 9
- user_msg_avg_len: 2660
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- SendMessage: 5
- Bash: 5
- Write: 3
- Agent: 1

## Tool Result Sizes (bytes)

- count: 14
- sum: 3,768
- p50: 313
- p90: 392
- max: 440

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 5 calls, 1,896B results, ~12,785 cache_create tok (6.74×)
- Bash: 4 calls, 756B results, ~11,684 cache_create tok (15.46×)
- Agent: 1 calls, 313B results, ~4,653 cache_create tok (14.87×)
- Write: 3 calls, 690B results, ~3,077 cache_create tok (4.46×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 31
- usd: $4.9724
- input: 62
- cache_create_5m: 0
- cache_create_1h: 33,282
- cache_read: 15,179,181
- output: 14,586

