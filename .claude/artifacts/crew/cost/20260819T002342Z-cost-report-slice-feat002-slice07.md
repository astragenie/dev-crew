---
kind: cost-report
feature: FEAT-002
run_title: "FEAT002 SLICE07"
usd: 11.498
duration_ms: 5513686
total_tokens: 31333330
cache_hit_pct: 99.4
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T00:23:42.611Z
---

# Cost Report: FEAT002 SLICE07

- Created: 2026-08-19T00:23:42.611Z
- Run Title: FEAT002 SLICE07
- Window Start: 2026-08-18T22:51:44.721Z
- Window End: 2026-08-19T00:23:38.407Z
- Duration: 91.9 min (5513686 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 72
- Total Tokens: 31,333,330
- Cache Hit %: 99.4%
- Total USD: $11.4980
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 144
- cache_create_5m: 0
- cache_create_1h: 175,541
- cache_read: 31,083,018
- output: 74,627

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 72 msgs (100%), $11.4980 (100%)

## Conversation Shape

- user_msg_count: 11
- user_msg_avg_len: 3722
- turns_before_first_tool: 0
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Bash: 9
- TaskCreate: 6
- Workflow: 3
- Agent: 3
- ToolSearch: 2
- TaskUpdate: 1
- SendMessage: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 26
- sum: 14,342
- p50: 315
- p90: 1,276
- max: 3,062

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 1 calls, 515B results, ~39,092 cache_create tok (75.91×)
- Workflow: 3 calls, 3,750B results, ~37,853 cache_create tok (10.09×)
- TaskCreate: 6 calls, 502B results, ~36,400 cache_create tok (72.51×)
- Bash: 8 calls, 4,331B results, ~32,401 cache_create tok (7.48×)
- Agent: 3 calls, 949B results, ~12,743 cache_create tok (13.43×)
- TaskUpdate: 1 calls, 32B results, ~7,546 cache_create tok (235.81×)
- Read: 1 calls, 3,062B results, ~4,434 cache_create tok (1.45×)
- ToolSearch: 2 calls, 104B results, ~3,142 cache_create tok (30.21×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 72
- usd: $11.4980
- input: 144
- cache_create_5m: 0
- cache_create_1h: 175,541
- cache_read: 31,083,018
- output: 74,627

