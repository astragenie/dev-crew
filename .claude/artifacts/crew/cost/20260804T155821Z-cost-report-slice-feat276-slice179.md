---
kind: cost-report
feature: FEAT-276
run_title: "FEAT276 SLICE179"
usd: 20.6981
duration_ms: 8768683
total_tokens: 54809816
cache_hit_pct: 99.2
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T15:58:21.248Z
---

# Cost Report: FEAT276 SLICE179

- Created: 2026-08-04T15:58:21.248Z
- Run Title: FEAT276 SLICE179
- Window Start: 2026-08-04T13:32:11.693Z
- Window End: 2026-08-04T15:58:20.376Z
- Duration: 146.1 min (8768683 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 213
- Total Tokens: 54,809,816
- Cache Hit %: 99.2%
- Total USD: $20.6981
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 407
- cache_create_5m: 0
- cache_create_1h: 419,744
- cache_read: 54,263,033
- output: 126,632

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 213 msgs (100%), $20.6981 (100%)

## Conversation Shape

- user_msg_count: 13
- user_msg_avg_len: 1994
- turns_before_first_tool: 1
- compaction_count: 4
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 82
- Agent: 4
- TaskCreate: 4
- SendMessage: 3
- Edit: 3
- Read: 2
- ToolSearch: 1
- TaskUpdate: 1

## Tool Result Sizes (bytes)

- count: 100
- sum: 53,234
- p50: 323
- p90: 1,204
- max: 4,210

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 81 calls, 40,837B results, ~367,668 cache_create tok (9×)
- Agent: 4 calls, 2,850B results, ~15,604 cache_create tok (5.48×)
- TaskCreate: 4 calls, 257B results, ~14,360 cache_create tok (55.88×)
- Edit: 3 calls, 632B results, ~7,560 cache_create tok (11.96×)
- SendMessage: 3 calls, 1,118B results, ~6,871 cache_create tok (6.15×)
- Read: 2 calls, 7,042B results, ~3,624 cache_create tok (0.51×)
- TaskUpdate: 1 calls, 23B results, ~1,616 cache_create tok (70.26×)
- ToolSearch: 1 calls, 152B results, ~1,265 cache_create tok (8.32×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 213
- usd: $20.6981
- input: 407
- cache_create_5m: 0
- cache_create_1h: 419,744
- cache_read: 54,263,033
- output: 126,632

