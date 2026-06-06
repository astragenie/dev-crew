---
kind: cost-report
slice: SLICE-57
run_title: "orchestrate-slice: SLICE-57 configurable grade-trend + autoMode warn-alert demotion"
usd: 169.029
duration_ms: 819947
total_tokens: 100915481
cache_hit_pct: 99.4
source_project: aggregate
aggregate_all: true
source_count: 4
created_at: 2026-06-06T15:12:06.397Z
---

# Cost Report: orchestrate-slice: SLICE-57 configurable grade-trend + autoMode warn-alert demotion

- Created: 2026-06-06T15:12:06.397Z
- Run Title: orchestrate-slice: SLICE-57 configurable grade-trend + autoMode warn-alert demotion
- Window Start: 2026-06-06T14:58:23.243Z
- Window End: 2026-06-06T15:12:03.190Z
- Duration: 13.7 min (819947 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 207
- Total Tokens: 100,915,481
- Cache Hit %: 99.4%
- Total USD: $169.0290
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 78 msgs, $87.4063
- C--work-mega-loop: 44 msgs, $44.3296
- C--work-mega-hero-crew: 46 msgs, $33.9563
- C--work-mega-cortex: 39 msgs, $3.3368

## Outcome Linkage

- Slice: SLICE-57
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 15,560
- cache_create_5m: 0
- cache_create_1h: 569,374
- cache_read: 100,132,373
- output: 198,174

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 168 msgs (81.16%), $165.6921 (98.03%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 39 msgs (18.84%), $3.3368 (1.97%)

## Conversation Shape

- user_msg_count: 7
- user_msg_avg_len: 388
- turns_before_first_tool: 0
- compaction_count: 3
- skill_invocations: 0
- subagent_dispatches: 8

## Tool Usage

- Bash: 43
- Edit: 19 (2 failed)
- Read: 18
- TaskUpdate: 17
- TaskCreate: 11
- Agent: 8
- mcp__plugin_playwright_playwright__browser_wait_for: 4
- mcp__plugin_playwright_playwright__browser_navigate: 3
- mcp__plugin_playwright_playwright__browser_take_screenshot: 3
- mcp__plugin_playwright_playwright__browser_evaluate: 3
- Write: 2
- AskUserQuestion: 2
- Grep: 2
- Glob: 1
- mcp__plugin_playwright_playwright__browser_click: 1

## Tool Result Sizes (bytes)

- count: 138
- sum: 387,563
- p50: 217
- p90: 2,015
- max: 115,816

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 3× C:\work\mega\loop\src\scripts\lib\stop-conditions.mts
  - 2× C:\work\mega\loopobserver\src\LoopBrain.Web\src\pages\application\AppScoresPage.tsx

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 7 calls, 10,237B results, ~265,592 cache_create tok (25.94×)
- Bash: 43 calls, 44,677B results, ~86,503 cache_create tok (1.94×)
- Read: 18 calls, 318,115B results, ~64,549 cache_create tok (0.2×)
- TaskUpdate: 17 calls, 391B results, ~52,023 cache_create tok (133.05×)
- Edit: 19 calls, 3,223B results, ~34,160 cache_create tok (10.6×)
- mcp__plugin_playwright_playwright__browser_evaluate: 3 calls, 2,730B results, ~15,605 cache_create tok (5.72×)
- TaskCreate: 11 calls, 813B results, ~14,745 cache_create tok (18.14×)
- mcp__plugin_playwright_playwright__browser_wait_for: 4 calls, 1,472B results, ~9,654 cache_create tok (6.56×)
- mcp__plugin_playwright_playwright__browser_navigate: 3 calls, 1,456B results, ~5,794 cache_create tok (3.98×)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 3 calls, 861B results, ~5,794 cache_create tok (6.73×)
- Write: 2 calls, 405B results, ~5,238 cache_create tok (12.93×)
- mcp__plugin_playwright_playwright__browser_click: 1 calls, 392B results, ~3,860 cache_create tok (9.85×)
- AskUserQuestion: 2 calls, 264B results, ~2,583 cache_create tok (9.78×)
- Grep: 2 calls, 311B results, ~1,039 cache_create tok (3.34×)
- Glob: 1 calls, 14B results, ~216 cache_create tok (15.43×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 39
- usd: $3.3368
- input: 57
- cache_create_5m: 0
- cache_create_1h: 291,399
- cache_read: 3,993,280
- output: 26,018

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 168
- usd: $165.6921
- input: 15,503
- cache_create_5m: 0
- cache_create_1h: 277,975
- cache_read: 96,139,093
- output: 172,156

