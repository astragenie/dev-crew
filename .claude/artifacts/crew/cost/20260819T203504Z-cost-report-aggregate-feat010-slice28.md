---
kind: cost-report
feature: FEAT-010
run_title: "FEAT010 SLICE28"
usd: 8.2124
duration_ms: 1146240
total_tokens: 20980404
cache_hit_pct: 98.9
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-08-19T20:35:04.002Z
---

# Cost Report: FEAT010 SLICE28

- Created: 2026-08-19T20:35:04.003Z
- Run Title: FEAT010 SLICE28
- Window Start: 2026-08-19T20:15:50.039Z
- Window End: 2026-08-19T20:34:56.279Z
- Duration: 19.1 min (1146240 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 101
- Total Tokens: 20,980,404
- Cache Hit %: 98.9%
- Total USD: $8.2124
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-runner-plugin: 37 msgs, $4.8798
- C--work-mega-prism: 26 msgs, $1.7236
- C--work-mega: 38 msgs, $1.6090

## Tokens (totals)

- input: 202
- cache_create_5m: 0
- cache_create_1h: 235,802
- cache_read: 20,705,374
- output: 39,026

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 101 msgs (100%), $8.2124 (100%)

## Conversation Shape

- user_msg_count: 7
- user_msg_avg_len: 2911
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 20 (2 failed)
- PowerShell: 8
- Read: 5
- SendMessage: 3
- ToolSearch: 2
- Agent: 2
- TaskCreate: 1 (1 failed)
- mcp__plugin_playwright_playwright__browser_navigate: 1
- mcp__plugin_playwright_playwright__browser_evaluate: 1
- mcp__plugin_playwright_playwright__browser_close: 1
- TaskStop: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 46
- sum: 21,778
- p50: 237
- p90: 1,430
- max: 4,433

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\Users\serge\AppData\Local\Temp\claude\C--work-mega\c6a05d47-b182-4c22-8aa6-a7ee037d6da4\tasks\bjmxujg89.output
  - 2× C:\Users\serge\AppData\Local\Temp\claude\C--work-mega-prism\e90d31eb-a76a-4c32-a6f1-54258b5da1f9\tasks\bcvska9ky.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 19 calls, 9,512B results, ~178,489 cache_create tok (18.76×)
- SendMessage: 3 calls, 1,132B results, ~16,141 cache_create tok (14.26×)
- Read: 5 calls, 3,688B results, ~11,347 cache_create tok (3.08×)
- PowerShell: 8 calls, 3,668B results, ~10,367 cache_create tok (2.83×)
- Agent: 2 calls, 628B results, ~8,622 cache_create tok (13.73×)
- ToolSearch: 2 calls, 99B results, ~3,504 cache_create tok (35.39×)
- TaskCreate: 1 calls, 1,430B results, ~2,664 cache_create tok (1.86×)
- mcp__plugin_playwright_playwright__browser_evaluate: 1 calls, 573B results, ~1,353 cache_create tok (2.36×)
- Write: 1 calls, 230B results, ~675 cache_create tok (2.93×)
- mcp__plugin_playwright_playwright__browser_close: 1 calls, 142B results, ~451 cache_create tok (3.18×)
- mcp__plugin_playwright_playwright__browser_navigate: 1 calls, 427B results, ~450 cache_create tok (1.05×)
- TaskStop: 1 calls, 183B results, ~338 cache_create tok (1.85×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 101
- usd: $8.2124
- input: 202
- cache_create_5m: 0
- cache_create_1h: 235,802
- cache_read: 20,705,374
- output: 39,026

