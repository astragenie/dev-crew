---
kind: cost-report
feature: FEAT-275
run_title: "FEAT275 SLICE178"
usd: 19.3417
duration_ms: 8633768
total_tokens: 51475392
cache_hit_pct: 99.2
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T15:56:07.023Z
---

# Cost Report: FEAT275 SLICE178

- Created: 2026-08-04T15:56:07.023Z
- Run Title: FEAT275 SLICE178
- Window Start: 2026-08-04T13:32:11.693Z
- Window End: 2026-08-04T15:56:05.461Z
- Duration: 143.9 min (8633768 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 185
- Total Tokens: 51,475,392
- Cache Hit %: 99.2%
- Total USD: $19.3417
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 351
- cache_create_5m: 0
- cache_create_1h: 392,754
- cache_read: 50,969,402
- output: 112,885

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 185 msgs (100%), $19.3417 (100%)

## Conversation Shape

- user_msg_count: 13
- user_msg_avg_len: 1994
- turns_before_first_tool: 1
- compaction_count: 4
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 71
- Agent: 4
- TaskCreate: 4
- SendMessage: 3
- Edit: 1
- ToolSearch: 1
- Read: 1
- TaskUpdate: 1

## Tool Result Sizes (bytes)

- count: 86
- sum: 39,594
- p50: 307
- p90: 1,118
- max: 4,210

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 70 calls, 30,514B results, ~345,029 cache_create tok (11.31×)
- Agent: 4 calls, 2,850B results, ~15,604 cache_create tok (5.48×)
- TaskCreate: 4 calls, 257B results, ~14,360 cache_create tok (55.88×)
- SendMessage: 3 calls, 1,118B results, ~6,871 cache_create tok (6.15×)
- Edit: 1 calls, 147B results, ~5,787 cache_create tok (39.37×)
- TaskUpdate: 1 calls, 23B results, ~1,616 cache_create tok (70.26×)
- ToolSearch: 1 calls, 152B results, ~1,265 cache_create tok (8.32×)
- Read: 1 calls, 4,210B results, ~1,046 cache_create tok (0.25×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 185
- usd: $19.3417
- input: 351
- cache_create_5m: 0
- cache_create_1h: 392,754
- cache_read: 50,969,402
- output: 112,885

