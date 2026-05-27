---
kind: cost-report
run_title: "fix cost-alert-loader reads wrong files"
usd: 40.3078
duration_ms: 428690
total_tokens: 27779711
cache_hit_pct: 99.4
source_project: aggregate
aggregate_all: true
source_count: 4
created_at: 2026-05-24T20:48:03.349Z
---

# Cost Report: Cost — fix cost-alert-loader reads wrong files

- Created: 2026-05-24T20:48:03.349Z
- Run Title: fix cost-alert-loader reads wrong files
- Window Start: 2026-05-24T20:40:54.036Z
- Window End: 2026-05-24T20:48:02.726Z
- Duration: 7.1 min (428690 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 139
- Total Tokens: 27,779,711
- Cache Hit %: 99.4%
- Total USD: $40.3078
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-AstraGenie-Common: 23 msgs, $17.3451
- C--work-mega-hero-crew-autonomous-loop: 55 msgs, $10.9060
- C--work-mega-AstraGenie-CityLive: 17 msgs, $9.3318
- C--work-mega-AstraGenie-MemoryService: 44 msgs, $2.7249

## Tokens (totals)

- input: 155
- cache_create_5m: 0
- cache_create_1h: 164,159
- cache_read: 27,549,312
- output: 66,085

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 95 msgs (68.35%), $37.5829 (93.24%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 44 msgs (31.65%), $2.7249 (6.76%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 37 (3 failed)
- Edit: 23
- Read: 12
- Write: 3 (1 failed)
- mcp__plugin_playwright_playwright__browser_navigate: 3
- mcp__plugin_playwright_playwright__browser_take_screenshot: 3
- Agent: 2
- Glob: 2
- mcp__plugin_playwright_playwright__browser_console_messages: 1

## Tool Result Sizes (bytes)

- count: 88
- sum: 1,849,812
- p50: 206
- p90: 5,045
- max: 605,604

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 3× C:\work\mega\hero-crew-autonomous-loop\tests\marathon-mode.test.mjs
  - 2× C:\work\mega\AstraGenie.MemoryService\src\MemoryService.Api\Controllers\AdminController.cs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 37 calls, 44,347B results, ~67,918 cache_create tok (1.53×)
- Read: 12 calls, 44,230B results, ~29,881 cache_create tok (0.68×)
- Edit: 23 calls, 4,039B results, ~22,905 cache_create tok (5.67×)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 3 calls, 1,741,012B results, ~17,268 cache_create tok (0.01×)
- Agent: 1 calls, 5,045B results, ~8,246 cache_create tok (1.63×)
- Write: 3 calls, 502B results, ~8,114 cache_create tok (16.16×)
- Glob: 2 calls, 4,446B results, ~1,986 cache_create tok (0.45×)
- mcp__plugin_playwright_playwright__browser_console_messages: 1 calls, 803B results, ~1,885 cache_create tok (2.35×)
- mcp__plugin_playwright_playwright__browser_navigate: 3 calls, 1,260B results, ~1,838 cache_create tok (1.46×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 95
- usd: $37.5829
- input: 105
- cache_create_5m: 0
- cache_create_1h: 105,032
- cache_read: 20,922,384
- output: 40,624

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 44
- usd: $2.7249
- input: 50
- cache_create_5m: 0
- cache_create_1h: 59,127
- cache_read: 6,626,928
- output: 25,461

