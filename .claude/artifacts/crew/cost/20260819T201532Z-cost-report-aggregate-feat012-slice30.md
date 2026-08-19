---
kind: cost-report
feature: FEAT-012
run_title: "FEAT012 SLICE30"
usd: 3.5034
duration_ms: 210772
total_tokens: 8795713
cache_hit_pct: 99.3
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-08-19T20:15:32.108Z
---

# Cost Report: FEAT012 SLICE30

- Created: 2026-08-19T20:15:32.108Z
- Run Title: FEAT012 SLICE30
- Window Start: 2026-08-19T20:11:52.282Z
- Window End: 2026-08-19T20:15:23.054Z
- Duration: 3.5 min (210772 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 57
- Total Tokens: 8,795,713
- Cache Hit %: 99.3%
- Total USD: $3.5034
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega: 46 msgs, $2.1145
- C--work-mega-runner-plugin: 11 msgs, $1.3889

## Tokens (totals)

- input: 114
- cache_create_5m: 0
- cache_create_1h: 58,992
- cache_read: 8,700,680
- output: 35,927

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 57 msgs (100%), $3.5034 (100%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 1615
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 13
- Agent: 4
- mcp__plugin_playwright_playwright__browser_navigate: 2
- mcp__plugin_playwright_playwright__browser_evaluate: 2
- mcp__plugin_playwright_playwright__browser_console_messages: 1
- ToolSearch: 1
- mcp__plugin_playwright_playwright__browser_network_requests: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 25
- sum: 10,745
- p50: 392
- p90: 833
- max: 1,458

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 12 calls, 5,309B results, ~28,256 cache_create tok (5.32×)
- Agent: 4 calls, 2,399B results, ~12,087 cache_create tok (5.04×)
- mcp__plugin_playwright_playwright__browser_evaluate: 2 calls, 910B results, ~2,642 cache_create tok (2.9×)
- mcp__plugin_playwright_playwright__browser_network_requests: 1 calls, 392B results, ~2,226 cache_create tok (5.68×)
- mcp__plugin_playwright_playwright__browser_navigate: 2 calls, 855B results, ~2,211 cache_create tok (2.59×)
- ToolSearch: 1 calls, 193B results, ~1,217 cache_create tok (6.31×)
- mcp__plugin_playwright_playwright__browser_console_messages: 1 calls, 374B results, ~744 cache_create tok (1.99×)
- Write: 1 calls, 230B results, ~597 cache_create tok (2.6×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 57
- usd: $3.5034
- input: 114
- cache_create_5m: 0
- cache_create_1h: 58,992
- cache_read: 8,700,680
- output: 35,927

