---
kind: cost-report
feature: FEAT-037
run_title: "FEAT037 SLICE59"
usd: 17.0018
duration_ms: 13868413
total_tokens: 40067632
cache_hit_pct: 99.7
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
run_id: "2026-11-09T00:33:45.735Z_2026-11-09T04:24:54.148Z"
created_at: 2026-11-09T04:24:54.428Z
---

# Cost Report: FEAT037 SLICE59

- Created: 2026-11-09T04:24:54.428Z
- Run Title: FEAT037 SLICE59
- Window Start: 2026-11-09T00:33:45.735Z
- Window End: 2026-11-09T04:24:54.148Z
- Duration: 231.1 min (13868413 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 89
- Total Tokens: 40,067,632
- Cache Hit %: 99.7%
- Total USD: $17.0018
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 1,782
- cache_create_5m: 0
- cache_create_1h: 126,503
- cache_read: 39,849,517
- output: 89,830

## Model Mix

- claude-fable-5-1 (priced as claude-fable-5-1): 89 msgs (100%), $17.0018 (100%)

## Conversation Shape

- user_msg_count: 22
- user_msg_avg_len: 1443
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 6

## Tool Usage

- Bash: 21
- Agent: 6
- SendMessage: 1
- ToolSearch: 1
- TaskStop: 1

## Tool Result Sizes (bytes)

- count: 30
- sum: 18,756
- p50: 364
- p90: 1,585
- max: 3,680

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 20 calls, 15,314B results, ~72,884 cache_create tok (4.76×)
- Agent: 6 calls, 1,904B results, ~48,138 cache_create tok (25.28×)
- ToolSearch: 1 calls, 50B results, ~2,314 cache_create tok (46.28×)
- SendMessage: 1 calls, 369B results, ~872 cache_create tok (2.36×)
- TaskStop: 1 calls, 228B results, ~588 cache_create tok (2.58×)


## By Model (token detail)

### claude-fable-5-1 (priced as claude-fable-5-1)
- messages: 89
- usd: $17.0018
- input: 1,782
- cache_create_5m: 0
- cache_create_1h: 126,503
- cache_read: 39,849,517
- output: 89,830

