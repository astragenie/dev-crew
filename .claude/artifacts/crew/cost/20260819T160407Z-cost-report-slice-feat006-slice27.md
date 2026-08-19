---
kind: cost-report
feature: FEAT-006
run_title: "FEAT006 SLICE27"
usd: 36.1364
duration_ms: 25081588
total_tokens: 95192571
cache_hit_pct: 99.2
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T16:04:07.980Z
---

# Cost Report: FEAT006 SLICE27

- Created: 2026-08-19T16:04:07.980Z
- Run Title: FEAT006 SLICE27
- Window Start: 2026-08-19T09:06:03.182Z
- Window End: 2026-08-19T16:04:04.770Z
- Duration: 418.0 min (25081588 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 419
- Total Tokens: 95,192,571
- Cache Hit %: 99.2%
- Total USD: $36.1364
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 838
- cache_create_5m: 0
- cache_create_1h: 795,425
- cache_read: 94,189,340
- output: 206,968

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 419 msgs (100%), $36.1364 (100%)

## Conversation Shape

- user_msg_count: 42
- user_msg_avg_len: 1717
- turns_before_first_tool: 0
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 6

## Tool Usage

- Bash: 151 (8 failed)
- Read: 12
- Edit: 10
- SendMessage: 8
- Write: 7
- Agent: 6
- ToolSearch: 2
- PowerShell: 1
- mcp__plugin_crew_astramem__recall_memory: 1

## Tool Result Sizes (bytes)

- count: 198
- sum: 822,791
- p50: 384
- p90: 2,090
- max: 650,584

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 150 calls, 145,735B results, ~676,763 cache_create tok (4.64×)
- Read: 12 calls, 663,256B results, ~35,136 cache_create tok (0.05×)
- SendMessage: 8 calls, 3,026B results, ~28,647 cache_create tok (9.47×)
- Agent: 6 calls, 1,894B results, ~23,316 cache_create tok (12.31×)
- Edit: 10 calls, 1,524B results, ~9,389 cache_create tok (6.16×)
- ToolSearch: 2 calls, 216B results, ~8,662 cache_create tok (40.1×)
- mcp__plugin_crew_astramem__recall_memory: 1 calls, 5,312B results, ~7,245 cache_create tok (1.36×)
- Write: 7 calls, 1,363B results, ~4,458 cache_create tok (3.27×)
- PowerShell: 1 calls, 106B results, ~1,041 cache_create tok (9.82×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 419
- usd: $36.1364
- input: 838
- cache_create_5m: 0
- cache_create_1h: 795,425
- cache_read: 94,189,340
- output: 206,968

