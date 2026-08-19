---
kind: cost-report
feature: FEAT-006
run_title: "FEAT006 SLICE26"
usd: 35.8073
duration_ms: 25049773
total_tokens: 94233399
cache_hit_pct: 99.2
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T16:03:36.247Z
---

# Cost Report: FEAT006 SLICE26

- Created: 2026-08-19T16:03:36.247Z
- Run Title: FEAT006 SLICE26
- Window Start: 2026-08-19T09:06:03.182Z
- Window End: 2026-08-19T16:03:32.955Z
- Duration: 417.5 min (25049773 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 416
- Total Tokens: 94,233,399
- Cache Hit %: 99.2%
- Total USD: $35.8073
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 832
- cache_create_5m: 0
- cache_create_1h: 793,443
- cache_read: 93,234,196
- output: 204,928

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 416 msgs (100%), $35.8073 (100%)

## Conversation Shape

- user_msg_count: 42
- user_msg_avg_len: 1717
- turns_before_first_tool: 0
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 6

## Tool Usage

- Bash: 150 (8 failed)
- Read: 12
- Edit: 10
- SendMessage: 8
- Agent: 6
- Write: 6
- ToolSearch: 2
- PowerShell: 1
- mcp__plugin_crew_astramem__recall_memory: 1

## Tool Result Sizes (bytes)

- count: 196
- sum: 822,182
- p50: 387
- p90: 2,090
- max: 650,584

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 149 calls, 145,356B results, ~675,747 cache_create tok (4.65×)
- Read: 12 calls, 663,256B results, ~35,136 cache_create tok (0.05×)
- SendMessage: 8 calls, 3,026B results, ~28,647 cache_create tok (9.47×)
- Agent: 6 calls, 1,894B results, ~23,316 cache_create tok (12.31×)
- Edit: 10 calls, 1,524B results, ~9,389 cache_create tok (6.16×)
- ToolSearch: 2 calls, 216B results, ~8,662 cache_create tok (40.1×)
- mcp__plugin_crew_astramem__recall_memory: 1 calls, 5,312B results, ~7,245 cache_create tok (1.36×)
- Write: 6 calls, 1,133B results, ~3,492 cache_create tok (3.08×)
- PowerShell: 1 calls, 106B results, ~1,041 cache_create tok (9.82×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 416
- usd: $35.8073
- input: 832
- cache_create_5m: 0
- cache_create_1h: 793,443
- cache_read: 93,234,196
- output: 204,928

