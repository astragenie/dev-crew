---
kind: cost-report
slice: SLICE-37
run_title: "FEAT-039 SLICE-37 — read-guard hook + model routing + costSliceCeiling — shipped v0.7.4"
usd: 74.6244
duration_ms: 4697879
total_tokens: 153791826
cache_hit_pct: 98.2
review_decision: approved
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-06-04T21:40:31.856Z
---

# Cost Report: FEAT-039 SLICE-37 — read-guard hook + model routing + costSliceCeiling — shipped v0.7.4

- Created: 2026-06-04T21:40:31.856Z
- Run Title: FEAT-039 SLICE-37 — read-guard hook + model routing + costSliceCeiling — shipped v0.7.4
- Window Start: 2026-06-04T20:22:12.073Z
- Window End: 2026-06-04T21:40:29.952Z
- Duration: 78.3 min (4697879 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 1264
- Total Tokens: 153,791,826
- Cache Hit %: 98.2%
- Total USD: $74.6244
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 593 msgs, $37.8665
- C--work-mega-loop: 515 msgs, $28.7872
- C--work-mega-hero-crew: 156 msgs, $7.9707

## Outcome Linkage

- Slice: SLICE-37
- Grade Avg: -
- Review Decision: approved
- Validation Decision: -

## Tokens (totals)

- input: 1,884
- cache_create_5m: 0
- cache_create_1h: 2,713,499
- cache_read: 150,562,216
- output: 514,227

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 1259 msgs (99.6%), $67.8048 (90.86%)
- claude-opus-4-7 (priced as claude-opus-4): 5 msgs (0.4%), $6.8196 (9.14%)

## Conversation Shape

- user_msg_count: 80
- user_msg_avg_len: 933
- turns_before_first_tool: 3
- compaction_count: 25
- skill_invocations: 4
- subagent_dispatches: 9

## Tool Usage

- Bash: 310 (11 failed)
- Read: 96
- Edit: 79 (6 failed)
- PowerShell: 48 (18 failed)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 29
- mcp__plugin_playwright_playwright__browser_click: 21 (8 failed)
- Write: 15 (1 failed)
- TaskUpdate: 14
- mcp__plugin_playwright_playwright__browser_snapshot: 14 (3 failed)
- ToolSearch: 13
- Glob: 13
- mcp__plugin_playwright_playwright__browser_navigate: 13
- mcp__plugin_playwright_playwright__browser_evaluate: 12
- Grep: 10
- Agent: 9
- TaskCreate: 7
- mcp__plugin_playwright_playwright__browser_select_option: 7 (1 failed)
- Skill: 4
- AskUserQuestion: 1

## Tool Result Sizes (bytes)

- count: 721
- sum: 17,111,124
- p50: 303
- p90: 3,682
- max: 654,894

## File Re-reads

- redundant_read_count: 33
- top paths:
  - 9× C:\work\mega\loop\.claude\worktrees\feat+012-checkpoint-wip-commits\src\scripts\lib\slice-linker\start-slice.mts
  - 4× C:\work\mega\loop\src\scripts\lib\stop-conditions.mts
  - 4× C:\work\mega\loop\.claude\worktrees\feat+012-checkpoint-wip-commits\src\scripts\lib\slice-linker\dispatch.mts
  - 4× C:\work\mega\loop\.claude\worktrees\feat+012-checkpoint-wip-commits\src\tests\slice-linker.test.mts
  - 4× C:\work\mega\loopobserver\tests\LoopBrain.Tests\Unit\CrewMonitor\Queries\GetFleetHealthHandlerTests.cs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 309 calls, 327,455B results, ~979,504 cache_create tok (2.99×)
- Read: 99 calls, 304,699B results, ~788,664 cache_create tok (2.59×)
- PowerShell: 48 calls, 44,252B results, ~228,342 cache_create tok (5.16×)
- Edit: 79 calls, 14,981B results, ~179,458 cache_create tok (11.98×)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 29 calls, 16,314,309B results, ~149,266 cache_create tok (0.01×)
- Write: 15 calls, 2,836B results, ~63,526 cache_create tok (22.4×)
- Agent: 9 calls, 21,698B results, ~62,515 cache_create tok (2.88×)
- Skill: 4 calls, 170B results, ~27,213 cache_create tok (160.08×)
- ToolSearch: 13 calls, 1,531B results, ~21,236 cache_create tok (13.87×)
- mcp__plugin_playwright_playwright__browser_snapshot: 14 calls, 21,361B results, ~16,884 cache_create tok (0.79×)
- Grep: 10 calls, 10,763B results, ~13,093 cache_create tok (1.22×)
- mcp__plugin_playwright_playwright__browser_click: 21 calls, 9,208B results, ~9,065 cache_create tok (0.98×)
- Glob: 14 calls, 4,357B results, ~9,028 cache_create tok (2.07×)
- mcp__plugin_playwright_playwright__browser_navigate: 13 calls, 4,980B results, ~8,673 cache_create tok (1.74×)
- mcp__plugin_playwright_playwright__browser_evaluate: 12 calls, 5,836B results, ~7,115 cache_create tok (1.22×)
- TaskUpdate: 14 calls, 308B results, ~5,162 cache_create tok (16.76×)
- mcp__plugin_playwright_playwright__browser_select_option: 7 calls, 3,053B results, ~3,508 cache_create tok (1.15×)
- TaskCreate: 7 calls, 564B results, ~1,187 cache_create tok (2.1×)
- AskUserQuestion: 1 calls, 155B results, ~782 cache_create tok (5.05×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 1259
- usd: $67.8048
- input: 1,879
- cache_create_5m: 0
- cache_create_1h: 2,707,665
- cache_read: 146,225,770
- output: 512,362

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 5
- usd: $6.8196
- input: 5
- cache_create_5m: 0
- cache_create_1h: 5,834
- cache_read: 4,336,446
- output: 1,865

