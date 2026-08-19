---
kind: cost-report
feature: FEAT-010
run_title: "FEAT010 SLICE28"
usd: 1.609
duration_ms: 1146240
total_tokens: 4498411
cache_hit_pct: 99.6
source_project: C--work-mega
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T20:34:59.411Z
---

# Cost Report: FEAT010 SLICE28

- Created: 2026-08-19T20:34:59.411Z
- Run Title: FEAT010 SLICE28
- Window Start: 2026-08-19T20:15:50.039Z
- Window End: 2026-08-19T20:34:56.279Z
- Duration: 19.1 min (1146240 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 38
- Total Tokens: 4,498,411
- Cache Hit %: 99.6%
- Total USD: $1.6090
- Source Project: C--work-mega
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 76
- cache_create_5m: 0
- cache_create_1h: 18,877
- cache_read: 4,469,141
- output: 10,317

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 38 msgs (100%), $1.6090 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 385
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 9 (1 failed)
- Read: 3
- ToolSearch: 2
- TaskCreate: 1 (1 failed)
- mcp__plugin_playwright_playwright__browser_navigate: 1
- mcp__plugin_playwright_playwright__browser_evaluate: 1
- mcp__plugin_playwright_playwright__browser_close: 1
- TaskStop: 1

## Tool Result Sizes (bytes)

- count: 19
- sum: 4,937
- p50: 183
- p90: 573
- max: 1,430

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\Users\serge\AppData\Local\Temp\claude\C--work-mega\c6a05d47-b182-4c22-8aa6-a7ee037d6da4\tasks\bjmxujg89.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 9 calls, 1,304B results, ~5,577 cache_create tok (4.28×)
- ToolSearch: 2 calls, 99B results, ~3,504 cache_create tok (35.39×)
- Read: 3 calls, 779B results, ~3,139 cache_create tok (4.03×)
- TaskCreate: 1 calls, 1,430B results, ~2,664 cache_create tok (1.86×)
- mcp__plugin_playwright_playwright__browser_evaluate: 1 calls, 573B results, ~1,353 cache_create tok (2.36×)
- mcp__plugin_playwright_playwright__browser_close: 1 calls, 142B results, ~451 cache_create tok (3.18×)
- mcp__plugin_playwright_playwright__browser_navigate: 1 calls, 427B results, ~450 cache_create tok (1.05×)
- TaskStop: 1 calls, 183B results, ~338 cache_create tok (1.85×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 38
- usd: $1.6090
- input: 76
- cache_create_5m: 0
- cache_create_1h: 18,877
- cache_read: 4,469,141
- output: 10,317

