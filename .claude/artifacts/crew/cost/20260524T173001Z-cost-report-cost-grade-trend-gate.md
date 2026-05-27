---
kind: cost-report
run_title: "grade-trend gate"
usd: 187.7229
duration_ms: 4985071
total_tokens: 147394847
cache_hit_pct: 98.5
source_project: aggregate
aggregate_all: true
source_count: 6
created_at: 2026-05-24T17:30:01.641Z
---

# Cost Report: Cost — grade-trend gate

- Created: 2026-05-24T17:30:01.641Z
- Run Title: grade-trend gate
- Window Start: 2026-05-24T16:06:55.953Z
- Window End: 2026-05-24T17:30:01.024Z
- Duration: 83.1 min (4985071 ms)
- Sessions Scanned: 6
- Assistant Messages Counted: 1070
- Total Tokens: 147,394,847
- Cache Hit %: 98.5%
- Total USD: $187.7229
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-AstraGenie-Common: 105 msgs, $67.1064
- C--work-mega-AstraGenie-CityLive: 166 msgs, $58.2118
- C--work-mega-hero-crew: 57 msgs, $26.8543
- C--work-mega-AstraGenie-MemoryService: 391 msgs, $18.9221
- C--work-mega-Astra-LoopObserver: 274 msgs, $12.4416
- C--work-mega-hero-crew-autonomous-loop: 77 msgs, $4.1869

## Tokens (totals)

- input: 2,983
- cache_create_5m: 0
- cache_create_1h: 2,203,081
- cache_read: 144,562,867
- output: 625,916

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 328 msgs (30.65%), $152.1724 (81.06%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 742 msgs (69.35%), $35.5506 (18.94%)

## Conversation Shape

- user_msg_count: 63
- user_msg_avg_len: 1168
- turns_before_first_tool: 1
- compaction_count: 11
- skill_invocations: 3
- subagent_dispatches: 8

## Tool Usage

- Bash: 294 (35 failed)
- Read: 99
- Edit: 48 (1 failed)
- TaskUpdate: 33
- Glob: 26
- TaskCreate: 19
- PowerShell: 16 (4 failed)
- Write: 13
- ToolSearch: 11
- Grep: 10
- Agent: 8
- mcp__plugin_playwright_playwright__browser_take_screenshot: 8
- mcp__plugin_playwright_playwright__browser_navigate: 7
- Skill: 3
- mcp__plugin_playwright_playwright__browser_click: 3 (1 failed)
- mcp__plugin_playwright_playwright__browser_snapshot: 2
- mcp__plugin_playwright_playwright__browser_console_messages: 2
- mcp__plugin_azure_azure__compute: 2
- AskUserQuestion: 1
- mcp__plugin_playwright_playwright__browser_evaluate: 1

## Tool Result Sizes (bytes)

- count: 613
- sum: 2,330,317
- p50: 279
- p90: 3,582
- max: 637,375

## File Re-reads

- redundant_read_count: 15
- top paths:
  - 3× C:\work\mega\AstraGenie.Common\src\AstraGenie.Gateway.Api\appsettings.yarp.AzureDev.json
  - 3× C:\work\mega\AstraGenie.MemoryService\.claude\crew\deployment.md
  - 3× C:\work\mega\hero-crew-autonomous-loop\scripts\lib\stop-conditions.mjs
  - 3× C:\work\mega\hero-crew-autonomous-loop\scripts\lib\slice-linker.mjs
  - 2× C:\work\mega\Astra.LoopObserver\.claude\crew\deployment.md

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 298 calls, 326,721B results, ~778,590 cache_create tok (2.38×)
- Read: 100 calls, 426,706B results, ~596,875 cache_create tok (1.4×)
- TaskCreate: 19 calls, 1,181B results, ~218,871 cache_create tok (185.33×)
- ToolSearch: 11 calls, 1,647B results, ~124,773 cache_create tok (75.76×)
- Glob: 27 calls, 42,435B results, ~98,802 cache_create tok (2.33×)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 8 calls, 1,414,662B results, ~74,402 cache_create tok (0.05×)
- Edit: 48 calls, 8,572B results, ~66,664 cache_create tok (7.78×)
- Agent: 8 calls, 27,712B results, ~55,907 cache_create tok (2.02×)
- TaskUpdate: 33 calls, 741B results, ~49,536 cache_create tok (66.85×)
- mcp__plugin_azure_azure__compute: 2 calls, 51,127B results, ~40,059 cache_create tok (0.78×)
- Write: 13 calls, 2,364B results, ~34,683 cache_create tok (14.67×)
- Grep: 10 calls, 10,921B results, ~26,080 cache_create tok (2.39×)
- PowerShell: 16 calls, 4,018B results, ~9,525 cache_create tok (2.37×)
- Skill: 3 calls, 82B results, ~7,060 cache_create tok (86.1×)
- mcp__plugin_playwright_playwright__browser_snapshot: 2 calls, 3,440B results, ~4,581 cache_create tok (1.33×)
- AskUserQuestion: 1 calls, 377B results, ~4,534 cache_create tok (12.03×)
- mcp__plugin_playwright_playwright__browser_navigate: 7 calls, 3,115B results, ~4,317 cache_create tok (1.39×)
- mcp__plugin_playwright_playwright__browser_console_messages: 2 calls, 2,875B results, ~3,651 cache_create tok (1.27×)
- mcp__plugin_playwright_playwright__browser_click: 3 calls, 1,137B results, ~793 cache_create tok (0.7×)
- mcp__plugin_playwright_playwright__browser_evaluate: 1 calls, 293B results, ~178 cache_create tok (0.61×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 742
- usd: $35.5506
- input: 1,010
- cache_create_5m: 0
- cache_create_1h: 1,237,707
- cache_read: 78,501,080
- output: 304,731

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 328
- usd: $152.1724
- input: 1,973
- cache_create_5m: 0
- cache_create_1h: 965,374
- cache_read: 66,061,787
- output: 321,185

