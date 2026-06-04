---
kind: cost-report
slice: SLICE-38
run_title: "SLICE-38 checkpoint-commit primitive"
usd: 14.3707
duration_ms: 746459
total_tokens: 21051954
cache_hit_pct: 96.6
review_decision: approved
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-04T22:01:31.296Z
---

# Cost Report: SLICE-38 checkpoint-commit primitive

- Created: 2026-06-04T22:01:31.296Z
- Run Title: SLICE-38 checkpoint-commit primitive
- Window Start: 2026-06-04T21:49:03.083Z
- Window End: 2026-06-04T22:01:29.542Z
- Duration: 12.4 min (746459 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 194
- Total Tokens: 21,051,954
- Cache Hit %: 96.6%
- Total USD: $14.3707
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 135 msgs, $7.6771
- C--work-mega-loop: 59 msgs, $6.6935

## Outcome Linkage

- Slice: SLICE-38
- Grade Avg: -
- Review Decision: approved
- Validation Decision: -

## Tokens (totals)

- input: 238
- cache_create_5m: 0
- cache_create_1h: 716,788
- cache_read: 20,262,686
- output: 72,242

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 190 msgs (97.94%), $10.7372 (74.72%)
- claude-opus-4-7 (priced as claude-opus-4): 4 msgs (2.06%), $3.6335 (25.28%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 7774
- turns_before_first_tool: 1
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 2

## Tool Usage

- Read: 26 (2 failed)
- Bash: 21 (6 failed)
- Glob: 20
- PowerShell: 13
- mcp__plugin_playwright_playwright__browser_take_screenshot: 9
- mcp__plugin_playwright_playwright__browser_click: 7 (2 failed)
- mcp__plugin_playwright_playwright__browser_navigate: 6
- Edit: 5
- Write: 3
- Agent: 2
- Grep: 2
- ToolSearch: 2
- Skill: 1
- mcp__plugin_playwright_playwright__browser_evaluate: 1
- mcp__plugin_playwright_playwright__browser_snapshot: 1
- mcp__plugin_playwright_playwright__browser_select_option: 1

## Tool Result Sizes (bytes)

- count: 120
- sum: 5,036,078
- p50: 415
- p90: 11,048
- max: 648,654

## File Re-reads

- redundant_read_count: 4
- top paths:
  - 3× C:\work\mega\loopobserver\src\LoopBrain.Infrastructure\Scanner\FileClassifier.cs
  - 2× C:\work\mega\loop\src\scripts\lib\slice-linker.mts
  - 2× C:\work\mega\loop\src\tests\loop-installer.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- mcp__plugin_playwright_playwright__browser_take_screenshot: 9 calls, 4,832,446B results, ~182,650 cache_create tok (0.04×)
- Read: 26 calls, 117,048B results, ~144,797 cache_create tok (1.24×)
- Write: 3 calls, 461B results, ~122,497 cache_create tok (265.72×)
- Bash: 21 calls, 18,839B results, ~72,150 cache_create tok (3.83×)
- Glob: 20 calls, 27,706B results, ~46,836 cache_create tok (1.69×)
- Agent: 2 calls, 8,930B results, ~19,497 cache_create tok (2.18×)
- PowerShell: 12 calls, 11,120B results, ~12,612 cache_create tok (1.13×)
- Skill: 1 calls, 27B results, ~5,582 cache_create tok (206.74×)
- mcp__plugin_playwright_playwright__browser_click: 7 calls, 3,408B results, ~3,687 cache_create tok (1.08×)
- mcp__plugin_playwright_playwright__browser_navigate: 6 calls, 2,482B results, ~2,484 cache_create tok (1×)
- Edit: 5 calls, 820B results, ~1,955 cache_create tok (2.38×)
- Grep: 2 calls, 1,076B results, ~1,708 cache_create tok (1.59×)
- ToolSearch: 2 calls, 188B results, ~1,317 cache_create tok (7.01×)
- mcp__plugin_playwright_playwright__browser_snapshot: 1 calls, 2,659B results, ~890 cache_create tok (0.33×)
- mcp__plugin_playwright_playwright__browser_evaluate: 1 calls, 873B results, ~559 cache_create tok (0.64×)
- mcp__plugin_playwright_playwright__browser_select_option: 1 calls, 361B results, ~249 cache_create tok (0.69×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 4
- usd: $3.6335
- input: 14
- cache_create_5m: 0
- cache_create_1h: 102,982
- cache_read: 178,270
- output: 3,686

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 190
- usd: $10.7372
- input: 224
- cache_create_5m: 0
- cache_create_1h: 613,806
- cache_read: 20,084,416
- output: 68,556

