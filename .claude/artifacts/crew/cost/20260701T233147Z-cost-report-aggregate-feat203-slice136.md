---
kind: cost-report
feature: FEAT-203
run_title: "FEAT203 SLICE136"
usd: 166.1547
duration_ms: 934525
total_tokens: 89725443
cache_hit_pct: 99.6
source_project: aggregate
aggregate_all: true
source_count: 6
created_at: 2026-07-01T23:31:47.000Z
---

# Cost Report: FEAT203 SLICE136

- Created: 2026-07-01T23:31:47.000Z
- Run Title: FEAT203 SLICE136
- Window Start: 2026-07-01T23:16:05.921Z
- Window End: 2026-07-01T23:31:40.446Z
- Duration: 15.6 min (934525 ms)
- Sessions Scanned: 6
- Assistant Messages Counted: 266
- Total Tokens: 89,725,443
- Cache Hit %: 99.6%
- Total USD: $166.1547
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-dev-team: 115 msgs, $71.9381
- C--work-mega-runner: 53 msgs, $27.1260
- C--work-mega-memory--claude-worktrees-cleanup: 30 msgs, $25.1622
- C--work-mega-sales: 43 msgs, $24.1182
- C--work-mega-runner-plugin: 17 msgs, $8.9896
- C--work-mega-astramemory-plugin: 8 msgs, $8.8205

## Tokens (totals)

- input: 594
- cache_create_5m: 0
- cache_create_1h: 347,529
- cache_read: 89,082,709
- output: 294,611

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 266 msgs (100%), $166.1547 (100%)

## Conversation Shape

- user_msg_count: 16
- user_msg_avg_len: 294
- turns_before_first_tool: 9
- compaction_count: 6
- skill_invocations: 1
- subagent_dispatches: 4

## Tool Usage

- Bash: 84 (3 failed)
- TaskUpdate: 21
- Read: 13
- Edit: 8 (3 failed)
- TaskCreate: 6
- Write: 6
- Grep: 5
- Agent: 4
- mcp__plugin_playwright_playwright__browser_navigate: 4
- mcp__plugin_playwright_playwright__browser_take_screenshot: 4
- mcp__plugin_playwright_playwright__browser_console_messages: 3
- ToolSearch: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 160
- sum: 508,187
- p50: 190
- p90: 1,288
- max: 128,176

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 3× C:\work\mega\dev-team\CHANGELOG.md
  - 2× C:\work\mega\memory\.claude\worktrees\cleanup\src\AstraMemory.Modules.Connectors.Core\Runtime\ConnectorSchedulerOptions.cs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 83 calls, 36,040B results, ~121,597 cache_create tok (3.37×)
- Write: 6 calls, 992B results, ~76,320 cache_create tok (76.94×)
- TaskUpdate: 21 calls, 480B results, ~46,545 cache_create tok (96.97×)
- Read: 13 calls, 456,477B results, ~35,636 cache_create tok (0.08×)
- Agent: 4 calls, 5,319B results, ~21,823 cache_create tok (4.1×)
- Edit: 8 calls, 1,900B results, ~9,865 cache_create tok (5.19×)
- Skill: 1 calls, 42B results, ~6,915 cache_create tok (164.64×)
- ToolSearch: 1 calls, 49B results, ~5,534 cache_create tok (112.94×)
- mcp__plugin_playwright_playwright__browser_navigate: 4 calls, 1,525B results, ~3,221 cache_create tok (2.11×)
- TaskCreate: 6 calls, 454B results, ~2,077 cache_create tok (4.57×)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 4 calls, 1,443B results, ~1,644 cache_create tok (1.14×)
- mcp__plugin_playwright_playwright__browser_console_messages: 3 calls, 525B results, ~1,449 cache_create tok (2.76×)
- Grep: 5 calls, 78B results, ~1,307 cache_create tok (16.76×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 266
- usd: $166.1547
- input: 594
- cache_create_5m: 0
- cache_create_1h: 347,529
- cache_read: 89,082,709
- output: 294,611

