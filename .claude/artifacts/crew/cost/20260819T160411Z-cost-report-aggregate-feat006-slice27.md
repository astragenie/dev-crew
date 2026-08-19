---
kind: cost-report
feature: FEAT-006
run_title: "FEAT006 SLICE27"
usd: 55.9133
duration_ms: 25081588
total_tokens: 138807644
cache_hit_pct: 98.9
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-08-19T16:04:11.465Z
---

# Cost Report: FEAT006 SLICE27

- Created: 2026-08-19T16:04:11.465Z
- Run Title: FEAT006 SLICE27
- Window Start: 2026-08-19T09:06:03.182Z
- Window End: 2026-08-19T16:04:04.770Z
- Duration: 418.0 min (25081588 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 534
- Total Tokens: 138,807,644
- Cache Hit %: 98.9%
- Total USD: $55.9133
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-runner-plugin: 419 msgs, $36.1364
- C--work-mega-kb: 115 msgs, $19.7769

## Tokens (totals)

- input: 1,068
- cache_create_5m: 0
- cache_create_1h: 1,548,482
- cache_read: 136,887,906
- output: 370,188

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 534 msgs (100%), $55.9133 (100%)

## Conversation Shape

- user_msg_count: 71
- user_msg_avg_len: 1830
- turns_before_first_tool: 1
- compaction_count: 6
- skill_invocations: 0
- subagent_dispatches: 17

## Tool Usage

- Bash: 156 (8 failed)
- Edit: 39 (1 failed)
- Agent: 17
- Read: 13
- SendMessage: 11
- Write: 7
- ToolSearch: 2
- Grep: 1
- PowerShell: 1
- mcp__plugin_crew_astramem__recall_memory: 1

## Tool Result Sizes (bytes)

- count: 248
- sum: 835,007
- p50: 334
- p90: 1,835
- max: 650,584

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 155 calls, 147,687B results, ~692,160 cache_create tok (4.69×)
- Agent: 17 calls, 5,375B results, ~91,367 cache_create tok (17×)
- SendMessage: 11 calls, 4,170B results, ~62,661 cache_create tok (15.03×)
- Edit: 39 calls, 6,495B results, ~59,899 cache_create tok (9.22×)
- Read: 13 calls, 663,892B results, ~35,564 cache_create tok (0.05×)
- ToolSearch: 2 calls, 216B results, ~8,662 cache_create tok (40.1×)
- mcp__plugin_crew_astramem__recall_memory: 1 calls, 5,312B results, ~7,245 cache_create tok (1.36×)
- Write: 7 calls, 1,363B results, ~4,458 cache_create tok (3.27×)
- PowerShell: 1 calls, 106B results, ~1,041 cache_create tok (9.82×)
- Grep: 1 calls, 32B results, ~321 cache_create tok (10.03×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 534
- usd: $55.9133
- input: 1,068
- cache_create_5m: 0
- cache_create_1h: 1,548,482
- cache_read: 136,887,906
- output: 370,188

