---
kind: cost-report
slice: SLICE-56
run_title: "orchestrate-slice: SLICE-56 worktree creation at slice-start"
usd: 344.8525
duration_ms: 2445626
total_tokens: 221099954
cache_hit_pct: 99.5
review_decision: approved_with_notes
validation_decision: PASS
source_project: aggregate
aggregate_all: true
source_count: 5
created_at: 2026-06-06T14:46:29.367Z
---

# Cost Report: orchestrate-slice: SLICE-56 worktree creation at slice-start

- Created: 2026-06-06T14:46:29.367Z
- Run Title: orchestrate-slice: SLICE-56 worktree creation at slice-start
- Window Start: 2026-06-06T14:05:40.229Z
- Window End: 2026-06-06T14:46:25.855Z
- Duration: 40.8 min (2445626 ms)
- Sessions Scanned: 5
- Assistant Messages Counted: 615
- Total Tokens: 221,099,954
- Cache Hit %: 99.5%
- Total USD: $344.8525
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 220 msgs, $187.6933
- C--work-mega-loop: 91 msgs, $82.5363
- C--work-mega-hero-crew: 90 msgs, $62.3610
- C--work-mega-cortex: 123 msgs, $7.3137
- C--work-mega-authentic: 91 msgs, $4.9482

## Outcome Linkage

- Slice: SLICE-56
- Grade Avg: -
- Review Decision: approved_with_notes
- Validation Decision: PASS

## Tokens (totals)

- input: 1,032
- cache_create_5m: 0
- cache_create_1h: 999,923
- cache_read: 219,639,976
- output: 459,023

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 401 msgs (65.2%), $332.5906 (96.44%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 214 msgs (34.8%), $12.2619 (3.56%)

## Conversation Shape

- user_msg_count: 10
- user_msg_avg_len: 1503
- turns_before_first_tool: 5
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 32

## Tool Usage

- Bash: 101 (6 failed)
- Read: 56 (1 failed)
- Edit: 41 (2 failed)
- mcp__plugin_playwright_playwright__browser_evaluate: 34
- Agent: 32
- TaskUpdate: 21
- mcp__plugin_playwright_playwright__browser_wait_for: 19
- mcp__plugin_playwright_playwright__browser_navigate: 17
- mcp__plugin_playwright_playwright__browser_take_screenshot: 9
- Glob: 8
- mcp__plugin_playwright_playwright__browser_click: 7 (3 failed)
- Write: 7 (2 failed)
- mcp__plugin_playwright_playwright__browser_snapshot: 6 (1 failed)
- Grep: 5
- mcp__plugin_playwright_playwright__browser_select_option: 4
- ToolSearch: 3
- PowerShell: 2
- mcp__plugin_playwright_playwright__browser_fill_form: 1
- mcp__plugin_playwright_playwright__browser_resize: 1
- TaskCreate: 1

## Tool Result Sizes (bytes)

- count: 377
- sum: 1,009,476
- p50: 375
- p90: 2,657
- max: 182,732

## File Re-reads

- redundant_read_count: 17
- top paths:
  - 6× C:\work\mega\loop\src\tests\worktree-manager.test.mts
  - 4× C:\work\mega\loop\src\scripts\lib\worktree-manager.mts
  - 4× C:\work\mega\loopobserver\src\LoopBrain.Web\src\components\charts\DailyTokenSpendBar.tsx
  - 3× C:\work\mega\loop\src\scripts\lib\slice-linker\start-slice.mts
  - 2× C:\work\mega\hero-crew\.claude\worktrees\v0.16.0-fe-be-split\scripts\validate-contracts.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 31 calls, 73,054B results, ~306,318 cache_create tok (4.19×)
- Bash: 101 calls, 78,994B results, ~203,432 cache_create tok (2.58×)
- Read: 56 calls, 776,494B results, ~148,856 cache_create tok (0.19×)
- mcp__plugin_playwright_playwright__browser_evaluate: 34 calls, 19,905B results, ~99,884 cache_create tok (5.02×)
- Edit: 41 calls, 7,542B results, ~55,796 cache_create tok (7.4×)
- TaskUpdate: 21 calls, 483B results, ~55,017 cache_create tok (113.91×)
- mcp__plugin_playwright_playwright__browser_snapshot: 6 calls, 20,949B results, ~25,914 cache_create tok (1.24×)
- mcp__plugin_playwright_playwright__browser_wait_for: 19 calls, 7,087B results, ~23,737 cache_create tok (3.35×)
- PowerShell: 2 calls, 130B results, ~20,164 cache_create tok (155.11×)
- mcp__plugin_playwright_playwright__browser_navigate: 17 calls, 7,205B results, ~15,636 cache_create tok (2.17×)
- Write: 7 calls, 1,049B results, ~12,194 cache_create tok (11.62×)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 9 calls, 3,116B results, ~6,520 cache_create tok (2.09×)
- mcp__plugin_playwright_playwright__browser_select_option: 4 calls, 1,515B results, ~5,323 cache_create tok (3.51×)
- mcp__plugin_playwright_playwright__browser_click: 7 calls, 1,657B results, ~5,294 cache_create tok (3.19×)
- Glob: 8 calls, 145B results, ~3,390 cache_create tok (23.38×)
- Grep: 5 calls, 982B results, ~3,339 cache_create tok (3.4×)
- TaskCreate: 1 calls, 74B results, ~3,202 cache_create tok (43.27×)
- ToolSearch: 3 calls, 565B results, ~2,302 cache_create tok (4.07×)
- mcp__plugin_playwright_playwright__browser_resize: 1 calls, 156B results, ~245 cache_create tok (1.57×)
- mcp__plugin_playwright_playwright__browser_fill_form: 1 calls, 267B results, ~238 cache_create tok (0.89×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 214
- usd: $12.2619
- input: 276
- cache_create_5m: 0
- cache_create_1h: 391,180
- cache_read: 26,171,929
- output: 137,491

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 401
- usd: $332.5906
- input: 756
- cache_create_5m: 0
- cache_create_1h: 608,743
- cache_read: 193,468,047
- output: 321,532

