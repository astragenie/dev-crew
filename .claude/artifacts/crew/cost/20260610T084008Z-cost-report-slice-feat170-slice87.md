---
kind: cost-report
feature: FEAT-170
run_title: "FEAT170 SLICE87"
usd: 43.4894
duration_ms: 2946643
total_tokens: 21393101
cache_hit_pct: 98.5
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-10T08:40:08.317Z
---

# Cost Report: FEAT170 SLICE87

- Created: 2026-06-10T08:40:08.317Z
- Run Title: FEAT170 SLICE87
- Window Start: 2026-06-10T07:51:01.475Z
- Window End: 2026-06-10T08:40:08.118Z
- Duration: 49.1 min (2946643 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 119
- Total Tokens: 21,393,101
- Cache Hit %: 98.5%
- Total USD: $43.4894
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 70,665
- cache_create_5m: 0
- cache_create_1h: 240,179
- cache_read: 20,966,948
- output: 115,309

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 110 msgs (92.44%), $42.2707 (97.2%)
- claude-fable-5 (priced as claude-sonnet-4): 9 msgs (7.56%), $1.2186 (2.8%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 98
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 5

## Tool Usage

- Bash: 26 (1 failed)
- Read: 7
- Agent: 5
- Edit: 5 (1 failed)
- Grep: 2
- Write: 2
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 48
- sum: 98,040
- p50: 290
- p90: 2,248
- max: 54,281

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\redundant-read-detector.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 7 calls, 64,525B results, ~72,778 cache_create tok (1.13×)
- Agent: 5 calls, 14,489B results, ~61,238 cache_create tok (4.23×)
- Bash: 25 calls, 7,453B results, ~56,349 cache_create tok (7.56×)
- Write: 2 calls, 361B results, ~13,827 cache_create tok (38.3×)
- Edit: 5 calls, 718B results, ~13,686 cache_create tok (19.06×)
- ToolSearch: 1 calls, 32B results, ~5,679 cache_create tok (177.47×)
- Grep: 2 calls, 1,247B results, ~3,974 cache_create tok (3.19×)


## By Model (token detail)

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 110
- usd: $42.2707
- input: 12,595
- cache_create_5m: 0
- cache_create_1h: 143,466
- cache_read: 20,317,955
- output: 97,345

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 9
- usd: $1.2186
- input: 58,070
- cache_create_5m: 0
- cache_create_1h: 96,713
- cache_read: 648,993
- output: 17,964

