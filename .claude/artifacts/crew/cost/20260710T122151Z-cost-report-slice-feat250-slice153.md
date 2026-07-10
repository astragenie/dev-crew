---
kind: cost-report
feature: FEAT-250
run_title: "FEAT250 SLICE153"
usd: 3233.2017
duration_ms: 610285334
total_tokens: 1830066145
cache_hit_pct: 98.5
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-10T12:21:51.863Z
---

# Cost Report: FEAT250 SLICE153

- Created: 2026-07-10T12:21:51.864Z
- Run Title: FEAT250 SLICE153
- Window Start: 2026-07-03T10:50:26.134Z
- Window End: 2026-07-10T12:21:51.468Z
- Duration: 10171.4 min (610285334 ms)
- Sessions Scanned: 18
- Assistant Messages Counted: 6518
- Total Tokens: 1,830,066,145
- Cache Hit %: 98.5%
- Total USD: $3233.2017
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 3,645,563
- cache_create_5m: 0
- cache_create_1h: 24,108,937
- cache_read: 1,795,794,870
- output: 6,516,775

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 4690 msgs (71.95%), $3051.4017 (94.38%)
- claude-fable-5 (priced as claude-sonnet-4): 1799 msgs (27.6%), $175.1954 (5.42%)
- claude-sonnet-5 (priced as claude-sonnet-4): 29 msgs (0.44%), $6.6047 (0.2%)

## Conversation Shape

- user_msg_count: 428
- user_msg_avg_len: 1569
- turns_before_first_tool: 1
- compaction_count: 30
- skill_invocations: 4
- subagent_dispatches: 140

## Tool Usage

- Bash: 1509 (27 failed)
- Edit: 356 (19 failed)
- Read: 294 (5 failed)
- Agent: 140 (1 failed)
- Write: 101 (2 failed)
- Grep: 48 (1 failed)
- TaskUpdate: 37
- SendMessage: 28
- ToolSearch: 25
- TaskCreate: 20
- Monitor: 10 (2 failed)
- AskUserQuestion: 9 (2 failed)
- Glob: 9
- PowerShell: 5 (1 failed)
- Skill: 4
- mcp__plugin_astramem_astramem__remember: 3
- TaskOutput: 2 (1 failed)
- TaskList: 2
- mcp__plugin_astramem_astramem__search_memory: 2
- mcp__plugin_astramem_astramem__invalidate_memory: 2
- TaskStop: 1
- Workflow: 1
- mcp__plugin_astramem_astramem__supersede_memory: 1

## Tool Result Sizes (bytes)

- count: 2632
- sum: 2,556,096
- p50: 291
- p90: 2,093
- max: 46,459

## File Re-reads

- redundant_read_count: 125
- top paths:
  - 10× C:\work\mega\runner-plugin\src\scripts\lib\slice-linker\start-slice.mts
  - 10× C:\work\mega\runner-plugin\src\scripts\lib\grade-writer.mts
  - 8× C:\Users\serge\.claude\projects\C--work-mega-runner-plugin\memory\MEMORY.md
  - 8× C:\work\mega\runner-plugin\src\tests\astrarunner-ingest.test.mts
  - 7× C:\work\mega\runner-plugin\CHANGELOG.md

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1524 calls, 1,166,272B results, ~11,900,345 cache_create tok (10.2×)
- Edit: 358 calls, 62,675B results, ~2,197,801 cache_create tok (35.07×)
- Read: 295 calls, 1,055,854B results, ~1,886,354 cache_create tok (1.79×)
- ToolSearch: 25 calls, 1,953B results, ~1,535,723 cache_create tok (786.34×)
- Write: 102 calls, 18,842B results, ~1,441,435 cache_create tok (76.5×)
- Agent: 143 calls, 94,608B results, ~1,261,228 cache_create tok (13.33×)
- AskUserQuestion: 9 calls, 3,336B results, ~946,071 cache_create tok (283.59×)
- TaskCreate: 20 calls, 1,789B results, ~827,575 cache_create tok (462.59×)
- Grep: 48 calls, 95,858B results, ~635,582 cache_create tok (6.63×)
- TaskUpdate: 37 calls, 874B results, ~486,103 cache_create tok (556.18×)
- SendMessage: 28 calls, 22,948B results, ~428,104 cache_create tok (18.66×)
- Glob: 9 calls, 5,688B results, ~342,485 cache_create tok (60.21×)
- TaskOutput: 2 calls, 230B results, ~81,360 cache_create tok (353.74×)
- Skill: 4 calls, 123B results, ~26,729 cache_create tok (217.31×)
- Monitor: 10 calls, 5,299B results, ~25,017 cache_create tok (4.72×)
- mcp__plugin_astramem_astramem__search_memory: 2 calls, 5,072B results, ~14,569 cache_create tok (2.87×)
- PowerShell: 5 calls, 1,095B results, ~14,248 cache_create tok (13.01×)
- Workflow: 1 calls, 1,329B results, ~8,712 cache_create tok (6.56×)
- mcp__plugin_astramem_astramem__remember: 3 calls, 264B results, ~8,228 cache_create tok (31.17×)
- mcp__plugin_astramem_astramem__invalidate_memory: 2 calls, 176B results, ~3,078 cache_create tok (17.49×)
- mcp__plugin_astramem_astramem__supersede_memory: 1 calls, 144B results, ~2,402 cache_create tok (16.68×)
- TaskStop: 1 calls, 853B results, ~1,021 cache_create tok (1.2×)
- TaskList: 2 calls, 28B results, ~535 cache_create tok (19.11×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 1799
- usd: $175.1954
- input: 1,143,042
- cache_create_5m: 0
- cache_create_1h: 7,578,288
- cache_read: 342,715,488
- output: 1,565,460

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 4690
- usd: $3051.4017
- input: 2,501,377
- cache_create_5m: 0
- cache_create_1h: 15,801,786
- cache_read: 1,446,842,689
- output: 4,927,512

### claude-sonnet-5 (priced as claude-sonnet-4)
- messages: 29
- usd: $6.6047
- input: 1,144
- cache_create_5m: 0
- cache_create_1h: 728,863
- cache_read: 6,236,693
- output: 23,803

