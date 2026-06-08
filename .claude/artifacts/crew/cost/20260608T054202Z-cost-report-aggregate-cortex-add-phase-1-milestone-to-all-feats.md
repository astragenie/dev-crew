---
kind: cost-report
run_title: "cortex: add Phase 1 milestone to all FEATs"
usd: 333.9414
duration_ms: 4209872
total_tokens: 188265840
cache_hit_pct: 98.9
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-06-08T05:42:02.750Z
---

# Cost Report: cortex: add Phase 1 milestone to all FEATs

- Created: 2026-06-08T05:42:02.750Z
- Run Title: cortex: add Phase 1 milestone to all FEATs
- Window Start: 2026-06-08T04:31:49.184Z
- Window End: 2026-06-08T05:41:59.056Z
- Duration: 70.2 min (4209872 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 930
- Total Tokens: 188,265,840
- Cache Hit %: 98.9%
- Total USD: $333.9414
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 376 msgs, $185.1276
- C--work-mega-loop: 309 msgs, $89.1696
- C--work-mega-hero-crew: 245 msgs, $59.6441

## Tokens (totals)

- input: 1,356
- cache_create_5m: 0
- cache_create_1h: 1,987,121
- cache_read: 185,744,706
- output: 532,657

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 724 msgs (77.85%), $322.8767 (96.69%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 206 msgs (22.15%), $11.0647 (3.31%)

## Conversation Shape

- user_msg_count: 41
- user_msg_avg_len: 599
- turns_before_first_tool: 1
- compaction_count: 12
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Bash: 270 (12 failed)
- Read: 97
- Edit: 86 (6 failed)
- Grep: 42 (3 failed)
- TaskUpdate: 21
- mcp__plugin_playwright_playwright__browser_evaluate: 12 (1 failed)
- Glob: 10 (2 failed)
- Write: 9
- TaskCreate: 8
- mcp__plugin_playwright_playwright__browser_navigate: 8
- PowerShell: 6
- ToolSearch: 4
- Agent: 3
- mcp__plugin_playwright_playwright__browser_snapshot: 3
- AskUserQuestion: 2 (1 failed)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 2
- Monitor: 1
- mcp__plugin_playwright_playwright__browser_click: 1
- mcp__plugin_playwright_playwright__browser_console_messages: 1

## Tool Result Sizes (bytes)

- count: 588
- sum: 570,244
- p50: 248
- p90: 1,981
- max: 52,647

## File Re-reads

- redundant_read_count: 24
- top paths:
  - 5× C:\work\mega\loop\src\tests\github-sync.test.mts
  - 4× C:\work\mega\hero-crew\agents\builder-be.md
  - 3× C:\work\mega\hero-crew\CHANGELOG.md
  - 3× C:\work\mega\loop\tests\github-sync.test.mjs
  - 3× C:\work\mega\loopobserver\src\LoopBrain.Application\Features\CrewMonitor\Dtos.cs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 269 calls, 180,084B results, ~936,952 cache_create tok (5.2×)
- Grep: 42 calls, 21,342B results, ~419,103 cache_create tok (19.64×)
- Read: 97 calls, 252,107B results, ~338,832 cache_create tok (1.34×)
- Edit: 86 calls, 14,392B results, ~99,305 cache_create tok (6.9×)
- mcp__plugin_playwright_playwright__browser_snapshot: 3 calls, 54,934B results, ~50,470 cache_create tok (0.92×)
- Write: 9 calls, 1,691B results, ~38,041 cache_create tok (22.5×)
- mcp__plugin_playwright_playwright__browser_evaluate: 12 calls, 14,754B results, ~26,442 cache_create tok (1.79×)
- Agent: 3 calls, 13,050B results, ~20,854 cache_create tok (1.6×)
- TaskUpdate: 21 calls, 462B results, ~15,067 cache_create tok (32.61×)
- ToolSearch: 4 calls, 1,042B results, ~9,036 cache_create tok (8.67×)
- mcp__plugin_playwright_playwright__browser_navigate: 8 calls, 5,535B results, ~6,127 cache_create tok (1.11×)
- TaskCreate: 8 calls, 525B results, ~6,084 cache_create tok (11.59×)
- Glob: 10 calls, 3,449B results, ~5,981 cache_create tok (1.73×)
- PowerShell: 6 calls, 538B results, ~4,654 cache_create tok (8.65×)
- AskUserQuestion: 2 calls, 981B results, ~3,771 cache_create tok (3.84×)
- mcp__plugin_playwright_playwright__browser_console_messages: 1 calls, 2,457B results, ~2,652 cache_create tok (1.08×)
- Monitor: 1 calls, 208B results, ~1,302 cache_create tok (6.26×)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 2 calls, 633B results, ~947 cache_create tok (1.5×)
- mcp__plugin_playwright_playwright__browser_click: 1 calls, 410B results, ~399 cache_create tok (0.97×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 724
- usd: $322.8767
- input: 1,094
- cache_create_5m: 0
- cache_create_1h: 1,181,799
- cache_read: 169,240,244
- output: 447,279

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 206
- usd: $11.0647
- input: 262
- cache_create_5m: 0
- cache_create_1h: 805,322
- cache_read: 16,504,462
- output: 85,378

