---
kind: cost-report
feature: FEAT-239
run_title: "FEAT239 SLICE142"
usd: 2978.0306
duration_ms: 454002004
total_tokens: 1554906665
cache_hit_pct: 98.6
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-08T16:57:08.438Z
---

# Cost Report: FEAT239 SLICE142

- Created: 2026-07-08T16:57:08.438Z
- Run Title: FEAT239 SLICE142
- Window Start: 2026-07-03T10:50:26.134Z
- Window End: 2026-07-08T16:57:08.138Z
- Duration: 7566.7 min (454002004 ms)
- Sessions Scanned: 16
- Assistant Messages Counted: 5162
- Total Tokens: 1,554,906,665
- Cache Hit %: 98.6%
- Total USD: $2978.0306
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 3,086,679
- cache_create_5m: 0
- cache_create_1h: 19,161,957
- cache_read: 1,527,175,595
- output: 5,482,434

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 4397 msgs (85.18%), $2891.7621 (97.1%)
- claude-fable-5 (priced as claude-sonnet-4): 736 msgs (14.26%), $79.6639 (2.68%)
- claude-sonnet-5 (priced as claude-sonnet-4): 29 msgs (0.56%), $6.6047 (0.22%)

## Conversation Shape

- user_msg_count: 333
- user_msg_avg_len: 1566
- turns_before_first_tool: 1
- compaction_count: 20
- skill_invocations: 0
- subagent_dispatches: 105

## Tool Usage

- Bash: 1103 (22 failed)
- Edit: 294 (8 failed)
- Read: 253 (5 failed)
- Agent: 105 (1 failed)
- Write: 85 (1 failed)
- Grep: 38 (1 failed)
- TaskUpdate: 27
- SendMessage: 24
- ToolSearch: 21
- TaskCreate: 15
- Monitor: 10 (2 failed)
- Glob: 9
- AskUserQuestion: 7 (1 failed)
- PowerShell: 3 (1 failed)
- mcp__plugin_astramem_astramem__remember: 3
- TaskOutput: 2 (1 failed)
- TaskList: 2
- mcp__plugin_astramem_astramem__search_memory: 2
- mcp__plugin_astramem_astramem__invalidate_memory: 2
- TaskStop: 1
- Workflow: 1
- mcp__plugin_astramem_astramem__supersede_memory: 1

## Tool Result Sizes (bytes)

- count: 2031
- sum: 2,120,038
- p50: 290
- p90: 2,201
- max: 46,459

## File Re-reads

- redundant_read_count: 114
- top paths:
  - 10× C:\work\mega\runner-plugin\src\scripts\lib\slice-linker\start-slice.mts
  - 10× C:\work\mega\runner-plugin\src\scripts\lib\grade-writer.mts
  - 8× C:\work\mega\runner-plugin\src\tests\astrarunner-ingest.test.mts
  - 7× C:\work\mega\runner-plugin\CHANGELOG.md
  - 7× C:\work\mega\plugins-common\docs\reviews\2026-07-07-cross-repo-consolidation-review-phase1-evidence.md

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1118 calls, 897,708B results, ~9,453,051 cache_create tok (10.53×)
- Read: 254 calls, 950,363B results, ~1,746,511 cache_create tok (1.84×)
- Write: 86 calls, 15,675B results, ~1,407,008 cache_create tok (89.76×)
- ToolSearch: 21 calls, 1,646B results, ~1,295,663 cache_create tok (787.16×)
- Edit: 296 calls, 50,767B results, ~1,187,175 cache_create tok (23.38×)
- Agent: 108 calls, 77,543B results, ~1,008,021 cache_create tok (13×)
- AskUserQuestion: 7 calls, 2,445B results, ~936,481 cache_create tok (383.02×)
- Grep: 38 calls, 71,566B results, ~597,706 cache_create tok (8.35×)
- TaskCreate: 15 calls, 1,252B results, ~562,285 cache_create tok (449.11×)
- SendMessage: 24 calls, 19,545B results, ~368,457 cache_create tok (18.85×)
- Glob: 9 calls, 5,688B results, ~342,485 cache_create tok (60.21×)
- TaskOutput: 2 calls, 230B results, ~81,360 cache_create tok (353.74×)
- TaskUpdate: 27 calls, 622B results, ~65,452 cache_create tok (105.23×)
- Monitor: 10 calls, 5,299B results, ~25,017 cache_create tok (4.72×)
- mcp__plugin_astramem_astramem__search_memory: 2 calls, 5,072B results, ~14,569 cache_create tok (2.87×)
- PowerShell: 3 calls, 1,037B results, ~12,508 cache_create tok (12.06×)
- Workflow: 1 calls, 1,329B results, ~8,712 cache_create tok (6.56×)
- mcp__plugin_astramem_astramem__remember: 3 calls, 264B results, ~8,228 cache_create tok (31.17×)
- mcp__plugin_astramem_astramem__invalidate_memory: 2 calls, 176B results, ~3,078 cache_create tok (17.49×)
- mcp__plugin_astramem_astramem__supersede_memory: 1 calls, 144B results, ~2,402 cache_create tok (16.68×)
- TaskStop: 1 calls, 853B results, ~1,021 cache_create tok (1.2×)
- TaskList: 2 calls, 28B results, ~535 cache_create tok (19.11×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 736
- usd: $79.6639
- input: 636,315
- cache_create_5m: 0
- cache_create_1h: 3,840,085
- cache_read: 143,379,081
- output: 780,047

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 4397
- usd: $2891.7621
- input: 2,449,220
- cache_create_5m: 0
- cache_create_1h: 14,593,009
- cache_read: 1,377,559,821
- output: 4,678,584

### claude-sonnet-5 (priced as claude-sonnet-4)
- messages: 29
- usd: $6.6047
- input: 1,144
- cache_create_5m: 0
- cache_create_1h: 728,863
- cache_read: 6,236,693
- output: 23,803

