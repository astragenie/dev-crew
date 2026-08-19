---
kind: cost-report
feature: FEAT-012
run_title: "FEAT012 SLICE30"
usd: 2.1145
duration_ms: 210772
total_tokens: 4693642
cache_hit_pct: 99
source_project: C--work-mega
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T20:15:27.760Z
---

# Cost Report: FEAT012 SLICE30

- Created: 2026-08-19T20:15:27.760Z
- Run Title: FEAT012 SLICE30
- Window Start: 2026-08-19T20:11:52.282Z
- Window End: 2026-08-19T20:15:23.054Z
- Duration: 3.5 min (210772 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 46
- Total Tokens: 4,693,642
- Cache Hit %: 99%
- Total USD: $2.1145
- Source Project: C--work-mega
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 92
- cache_create_5m: 0
- cache_create_1h: 48,478
- cache_read: 4,615,834
- output: 29,238

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 46 msgs (100%), $2.1145 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 11
- mcp__plugin_playwright_playwright__browser_navigate: 2
- mcp__plugin_playwright_playwright__browser_evaluate: 2
- mcp__plugin_playwright_playwright__browser_console_messages: 1
- ToolSearch: 1
- mcp__plugin_playwright_playwright__browser_network_requests: 1
- Agent: 1

## Tool Result Sizes (bytes)

- count: 19
- sum: 9,407
- p50: 425
- p90: 881
- max: 1,458

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 11 calls, 5,225B results, ~25,842 cache_create tok (4.95×)
- Agent: 1 calls, 1,458B results, ~4,584 cache_create tok (3.14×)
- mcp__plugin_playwright_playwright__browser_evaluate: 2 calls, 910B results, ~2,642 cache_create tok (2.9×)
- mcp__plugin_playwright_playwright__browser_network_requests: 1 calls, 392B results, ~2,226 cache_create tok (5.68×)
- mcp__plugin_playwright_playwright__browser_navigate: 2 calls, 855B results, ~2,211 cache_create tok (2.59×)
- ToolSearch: 1 calls, 193B results, ~1,217 cache_create tok (6.31×)
- mcp__plugin_playwright_playwright__browser_console_messages: 1 calls, 374B results, ~744 cache_create tok (1.99×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 46
- usd: $2.1145
- input: 92
- cache_create_5m: 0
- cache_create_1h: 48,478
- cache_read: 4,615,834
- output: 29,238

