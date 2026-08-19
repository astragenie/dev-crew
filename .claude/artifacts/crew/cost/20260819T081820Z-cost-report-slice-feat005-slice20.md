---
kind: cost-report
feature: FEAT-005
run_title: "FEAT005 SLICE20"
usd: 14.6441
duration_ms: 3997634
total_tokens: 43914867
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T08:18:20.744Z
---

# Cost Report: FEAT005 SLICE20

- Created: 2026-08-19T08:18:20.744Z
- Run Title: FEAT005 SLICE20
- Window Start: 2026-08-19T07:11:37.889Z
- Window End: 2026-08-19T08:18:15.523Z
- Duration: 66.6 min (3997634 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 60
- Total Tokens: 43,914,867
- Cache Hit %: 99.8%
- Total USD: $14.6441
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 120
- cache_create_5m: 0
- cache_create_1h: 97,778
- cache_read: 43,754,929
- output: 62,040

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 60 msgs (100%), $14.6441 (100%)

## Conversation Shape

- user_msg_count: 14
- user_msg_avg_len: 2195
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 7

## Tool Usage

- Agent: 7
- Bash: 7
- SendMessage: 2
- Workflow: 1

## Tool Result Sizes (bytes)

- count: 17
- sum: 10,568
- p50: 313
- p90: 1,249
- max: 5,100

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 7 calls, 2,197B results, ~46,070 cache_create tok (20.97×)
- Bash: 6 calls, 5,699B results, ~39,386 cache_create tok (6.91×)
- SendMessage: 2 calls, 773B results, ~10,174 cache_create tok (13.16×)
- Workflow: 1 calls, 1,249B results, ~537 cache_create tok (0.43×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 60
- usd: $14.6441
- input: 120
- cache_create_5m: 0
- cache_create_1h: 97,778
- cache_read: 43,754,929
- output: 62,040

