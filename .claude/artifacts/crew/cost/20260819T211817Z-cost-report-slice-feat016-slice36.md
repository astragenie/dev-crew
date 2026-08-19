---
kind: cost-report
feature: FEAT-016
run_title: "FEAT016 SLICE36"
usd: 0.9692
duration_ms: 86367
total_tokens: 2892003
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T21:18:17.087Z
---

# Cost Report: FEAT016 SLICE36

- Created: 2026-08-19T21:18:17.087Z
- Run Title: FEAT016 SLICE36
- Window Start: 2026-08-19T21:16:47.578Z
- Window End: 2026-08-19T21:18:13.945Z
- Duration: 1.4 min (86367 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 6
- Total Tokens: 2,892,003
- Cache Hit %: 99.7%
- Total USD: $0.9692
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 12
- cache_create_5m: 0
- cache_create_1h: 7,686
- cache_read: 2,880,376
- output: 3,929

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 6 msgs (100%), $0.9692 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 4378
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Agent: 1
- SendMessage: 1
- Write: 1
- Bash: 1

## Tool Result Sizes (bytes)

- count: 4
- sum: 1,048
- p50: 313
- p90: 392
- max: 392

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 313B results, ~4,653 cache_create tok (14.87×)
- SendMessage: 1 calls, 392B results, ~1,129 cache_create tok (2.88×)
- Write: 1 calls, 230B results, ~821 cache_create tok (3.57×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 6
- usd: $0.9692
- input: 12
- cache_create_5m: 0
- cache_create_1h: 7,686
- cache_read: 2,880,376
- output: 3,929

