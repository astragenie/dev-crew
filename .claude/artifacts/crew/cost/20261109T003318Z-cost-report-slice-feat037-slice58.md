---
kind: cost-report
feature: FEAT-037
run_title: "FEAT037 SLICE58"
usd: 36.2803
duration_ms: 2834048
total_tokens: 54454425
cache_hit_pct: 98.9
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
run_id: "2026-11-08T23:46:04.771Z_2026-11-09T00:33:18.819Z"
created_at: 2026-11-09T00:33:18.995Z
---

# Cost Report: FEAT037 SLICE58

- Created: 2026-11-09T00:33:18.995Z
- Run Title: FEAT037 SLICE58
- Window Start: 2026-11-08T23:46:04.771Z
- Window End: 2026-11-09T00:33:18.819Z
- Duration: 47.2 min (2834048 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 152
- Total Tokens: 54,454,425
- Cache Hit %: 98.9%
- Total USD: $36.2803
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 3,770
- cache_create_5m: 0
- cache_create_1h: 600,433
- cache_read: 53,633,712
- output: 216,510

## Model Mix

- claude-fable-5-1 (priced as claude-fable-5-1): 152 msgs (100%), $36.2803 (100%)

## Conversation Shape

- user_msg_count: 20
- user_msg_avg_len: 1803
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 8

## Tool Usage

- Bash: 48 (1 failed)
- Agent: 8
- ToolSearch: 2
- PowerShell: 1 (1 failed)
- mcp__claude-in-chrome__navigate: 1 (1 failed)
- mcp__claude-in-chrome__tabs_context_mcp: 1
- WebFetch: 1

## Tool Result Sizes (bytes)

- count: 62
- sum: 60,116
- p50: 596
- p90: 2,275
- max: 4,799

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- ToolSearch: 2 calls, 778B results, ~300,391 cache_create tok (386.11×)
- Bash: 47 calls, 50,382B results, ~229,708 cache_create tok (4.56×)
- Agent: 8 calls, 2,564B results, ~50,664 cache_create tok (19.76×)
- PowerShell: 1 calls, 11B results, ~11,214 cache_create tok (1019.45×)
- WebFetch: 1 calls, 849B results, ~1,827 cache_create tok (2.15×)
- mcp__claude-in-chrome__tabs_context_mcp: 1 calls, 492B results, ~500 cache_create tok (1.02×)
- mcp__claude-in-chrome__navigate: 1 calls, 241B results, ~207 cache_create tok (0.86×)


## By Model (token detail)

### claude-fable-5-1 (priced as claude-fable-5-1)
- messages: 152
- usd: $36.2803
- input: 3,770
- cache_create_5m: 0
- cache_create_1h: 600,433
- cache_read: 53,633,712
- output: 216,510

