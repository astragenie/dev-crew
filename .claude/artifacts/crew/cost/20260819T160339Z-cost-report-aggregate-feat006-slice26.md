---
kind: cost-report
feature: FEAT-006
run_title: "FEAT006 SLICE26"
usd: 55.5842
duration_ms: 25049773
total_tokens: 137848472
cache_hit_pct: 98.9
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-08-19T16:03:39.516Z
---

# Cost Report: FEAT006 SLICE26

- Created: 2026-08-19T16:03:39.516Z
- Run Title: FEAT006 SLICE26
- Window Start: 2026-08-19T09:06:03.182Z
- Window End: 2026-08-19T16:03:32.955Z
- Duration: 417.5 min (25049773 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 531
- Total Tokens: 137,848,472
- Cache Hit %: 98.9%
- Total USD: $55.5842
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-runner-plugin: 416 msgs, $35.8073
- C--work-mega-kb: 115 msgs, $19.7769

## Tokens (totals)

- input: 1,062
- cache_create_5m: 0
- cache_create_1h: 1,546,500
- cache_read: 135,932,762
- output: 368,148

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 531 msgs (100%), $55.5842 (100%)

## Conversation Shape

- user_msg_count: 71
- user_msg_avg_len: 1830
- turns_before_first_tool: 1
- compaction_count: 6
- skill_invocations: 0
- subagent_dispatches: 17

## Tool Usage

- Bash: 155 (8 failed)
- Edit: 39 (1 failed)
- Agent: 17
- Read: 13
- SendMessage: 11
- Write: 6
- ToolSearch: 2
- Grep: 1
- PowerShell: 1
- mcp__plugin_crew_astramem__recall_memory: 1

## Tool Result Sizes (bytes)

- count: 246
- sum: 834,398
- p50: 334
- p90: 1,835
- max: 650,584

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 154 calls, 147,308B results, ~691,144 cache_create tok (4.69×)
- Agent: 17 calls, 5,375B results, ~91,367 cache_create tok (17×)
- SendMessage: 11 calls, 4,170B results, ~62,661 cache_create tok (15.03×)
- Edit: 39 calls, 6,495B results, ~59,899 cache_create tok (9.22×)
- Read: 13 calls, 663,892B results, ~35,564 cache_create tok (0.05×)
- ToolSearch: 2 calls, 216B results, ~8,662 cache_create tok (40.1×)
- mcp__plugin_crew_astramem__recall_memory: 1 calls, 5,312B results, ~7,245 cache_create tok (1.36×)
- Write: 6 calls, 1,133B results, ~3,492 cache_create tok (3.08×)
- PowerShell: 1 calls, 106B results, ~1,041 cache_create tok (9.82×)
- Grep: 1 calls, 32B results, ~321 cache_create tok (10.03×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 531
- usd: $55.5842
- input: 1,062
- cache_create_5m: 0
- cache_create_1h: 1,546,500
- cache_read: 135,932,762
- output: 368,148

