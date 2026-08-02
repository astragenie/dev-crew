---
kind: cost-report
feature: FEAT-272
run_title: "FEAT272 SLICE172"
usd: 503.319
duration_ms: 1565724497
total_tokens: 896845359
cache_hit_pct: 99
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-02T18:16:32.915Z
---

# Cost Report: FEAT272 SLICE172

- Created: 2026-08-02T18:16:32.915Z
- Run Title: FEAT272 SLICE172
- Window Start: 2026-07-15T15:21:05.809Z
- Window End: 2026-08-02T18:16:30.306Z
- Duration: 26095.4 min (1565724497 ms)
- Sessions Scanned: 7
- Assistant Messages Counted: 3417
- Total Tokens: 896,845,359
- Cache Hit %: 99%
- Total USD: $503.3190
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 31,037
- cache_create_5m: 0
- cache_create_1h: 9,103,543
- cache_read: 884,833,737
- output: 2,877,042

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 2929 msgs (85.72%), $319.0196 (63.38%)
- claude-opus-4-8 (priced as claude-opus-4): 463 msgs (13.55%), $174.9986 (34.77%)
- claude-opus-5 (priced as claude-sonnet-4): 25 msgs (0.73%), $9.3007 (1.85%)

## Conversation Shape

- user_msg_count: 342
- user_msg_avg_len: 1854
- turns_before_first_tool: 2
- compaction_count: 38
- skill_invocations: 6
- subagent_dispatches: 127

## Tool Usage

- Bash: 841 (37 failed)
- Agent: 127
- Edit: 125 (11 failed)
- Read: 97 (1 failed)
- SendMessage: 59
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

- count: 1445
- sum: 2,553,206
- p50: 296
- p90: 1,877
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

- Bash: 847 calls, 530,810B results, ~4,485,974 cache_create tok (8.45×)
- Agent: 128 calls, 70,396B results, ~1,925,191 cache_create tok (27.35×)
- Read: 99 calls, 1,599,600B results, ~618,769 cache_create tok (0.39×)
- SendMessage: 59 calls, 49,338B results, ~545,113 cache_create tok (11.05×)
- Edit: 126 calls, 22,680B results, ~243,972 cache_create tok (10.76×)
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
- messages: 2929
- usd: $319.0196
- input: 30,125
- cache_create_5m: 0
- cache_create_1h: 7,218,159
- cache_read: 795,225,097
- output: 2,470,186

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 463
- usd: $174.9986
- input: 862
- cache_create_5m: 0
- cache_create_1h: 805,854
- cache_read: 81,123,112
- output: 388,339

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 25
- usd: $9.3007
- input: 50
- cache_create_5m: 0
- cache_create_1h: 1,079,530
- cache_read: 8,485,528
- output: 18,517

