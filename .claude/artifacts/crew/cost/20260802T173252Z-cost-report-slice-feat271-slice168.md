---
kind: cost-report
feature: FEAT-271
run_title: "FEAT271 SLICE168"
usd: 489.4562
duration_ms: 1563101998
total_tokens: 873713884
cache_hit_pct: 99.1
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-02T17:32:52.005Z
---

# Cost Report: FEAT271 SLICE168

- Created: 2026-08-02T17:32:52.005Z
- Run Title: FEAT271 SLICE168
- Window Start: 2026-07-15T15:21:05.809Z
- Window End: 2026-08-02T17:32:47.807Z
- Duration: 26051.7 min (1563101998 ms)
- Sessions Scanned: 7
- Assistant Messages Counted: 3359
- Total Tokens: 873,713,884
- Cache Hit %: 99.1%
- Total USD: $489.4562
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 30,921
- cache_create_5m: 0
- cache_create_1h: 7,983,447
- cache_read: 862,859,108
- output: 2,840,408

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 2896 msgs (86.22%), $314.4576 (64.25%)
- claude-opus-4-8 (priced as claude-opus-4): 463 msgs (13.78%), $174.9986 (35.75%)

## Conversation Shape

- user_msg_count: 330
- user_msg_avg_len: 1873
- turns_before_first_tool: 2
- compaction_count: 35
- skill_invocations: 6
- subagent_dispatches: 126

## Tool Usage

- Bash: 824 (36 failed)
- Agent: 126
- Edit: 124 (11 failed)
- Read: 95
- SendMessage: 58
- Write: 42
- Grep: 22 (2 failed)
- ToolSearch: 19
- PowerShell: 16 (1 failed)
- TaskUpdate: 13
- TaskCreate: 11
- mcp__plugin_crew_astramem__search_memory: 10
- Skill: 6
- mcp__plugin_crew_astramem__agent_profile: 6
- mcp__plugin_crew_astramem__submit_feedback: 6
- mcp__plugin_crew_astramem__remember: 6
- AskUserQuestion: 5
- Glob: 4
- mcp__plugin_crew_astramem__recall_memory: 4
- mcp__plugin_crew_astramem__get_health: 3 (1 failed)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 3 (1 failed)
- mcp__plugin_playwright_playwright__browser_navigate: 2
- mcp__plugin_crew_astramem__why_memory: 1
- mcp__plugin_crew_astramem__list_consolidation_proposals: 1
- mcp__plugin_crew_astramem__session_digest: 1
- Monitor: 1 (1 failed)
- mcp__plugin_playwright_playwright__browser_snapshot: 1
- mcp__plugin_playwright_playwright__browser_find: 1 (1 failed)
- mcp__plugin_crew_astramem__supersede_memory: 1

## Tool Result Sizes (bytes)

- count: 1423
- sum: 2,540,881
- p50: 295
- p90: 1,889
- max: 569,745

## File Re-reads

- redundant_read_count: 22
- top paths:
  - 7× C:\work\mega\runner-plugin\src\scripts\lib\memory-snapshot.mts
  - 5× C:\Users\serge\.claude\projects\C--work-mega-runner-plugin\memory\MEMORY.md
  - 5× C:\work\mega\runner-plugin\src\scripts\dispatch.mts
  - 3× C:\work\mega\runner-plugin\docs\research\2026-07-18-competitive-audit.md
  - 2× C:\work\mega\runner-plugin\CLAUDE.md

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 830 calls, 520,752B results, ~4,429,562 cache_create tok (8.51×)
- Agent: 127 calls, 70,087B results, ~871,002 cache_create tok (12.43×)
- Read: 97 calls, 1,598,148B results, ~617,683 cache_create tok (0.39×)
- SendMessage: 58 calls, 48,976B results, ~537,090 cache_create tok (10.97×)
- Edit: 125 calls, 22,536B results, ~243,586 cache_create tok (10.81×)
- Write: 42 calls, 8,161B results, ~218,130 cache_create tok (26.73×)
- mcp__plugin_crew_astramem__search_memory: 10 calls, 57,275B results, ~154,308 cache_create tok (2.69×)
- Glob: 4 calls, 12,632B results, ~114,286 cache_create tok (9.05×)
- Grep: 22 calls, 18,040B results, ~102,874 cache_create tok (5.7×)
- Skill: 6 calls, 202B results, ~102,199 cache_create tok (505.94×)
- mcp__plugin_crew_astramem__recall_memory: 4 calls, 29,340B results, ~78,595 cache_create tok (2.68×)
- ToolSearch: 19 calls, 2,622B results, ~68,026 cache_create tok (25.94×)
- PowerShell: 16 calls, 25,073B results, ~61,742 cache_create tok (2.46×)
- TaskCreate: 11 calls, 1,130B results, ~39,084 cache_create tok (34.59×)
- AskUserQuestion: 5 calls, 1,573B results, ~28,818 cache_create tok (18.32×)
- TaskUpdate: 13 calls, 286B results, ~28,115 cache_create tok (98.3×)
- mcp__plugin_crew_astramem__agent_profile: 6 calls, 52,669B results, ~22,519 cache_create tok (0.43×)
- mcp__plugin_playwright_playwright__browser_snapshot: 1 calls, 19,445B results, ~21,033 cache_create tok (1.08×)
- mcp__plugin_crew_astramem__remember: 6 calls, 572B results, ~20,259 cache_create tok (35.42×)
- mcp__plugin_crew_astramem__why_memory: 1 calls, 1,747B results, ~15,629 cache_create tok (8.95×)
- mcp__plugin_crew_astramem__list_consolidation_proposals: 1 calls, 1,553B results, ~15,629 cache_create tok (10.06×)
- mcp__plugin_crew_astramem__submit_feedback: 6 calls, 528B results, ~10,986 cache_create tok (20.81×)
- mcp__plugin_crew_astramem__get_health: 3 calls, 191B results, ~5,573 cache_create tok (29.18×)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 3 calls, 981B results, ~2,953 cache_create tok (3.01×)
- mcp__plugin_playwright_playwright__browser_navigate: 2 calls, 3,196B results, ~2,366 cache_create tok (0.74×)
- mcp__plugin_playwright_playwright__browser_find: 1 calls, 2,728B results, ~2,044 cache_create tok (0.75×)
- Monitor: 1 calls, 1,772B results, ~2,030 cache_create tok (1.15×)
- mcp__plugin_crew_astramem__supersede_memory: 1 calls, 144B results, ~591 cache_create tok (4.1×)
- mcp__plugin_crew_astramem__session_digest: 1 calls, 27,061B results, ~565 cache_create tok (0.02×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 2896
- usd: $314.4576
- input: 30,059
- cache_create_5m: 0
- cache_create_1h: 7,177,593
- cache_read: 781,735,996
- output: 2,452,069

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 463
- usd: $174.9986
- input: 862
- cache_create_5m: 0
- cache_create_1h: 805,854
- cache_read: 81,123,112
- output: 388,339

