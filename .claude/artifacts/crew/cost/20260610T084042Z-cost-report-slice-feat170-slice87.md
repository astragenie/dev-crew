---
kind: cost-report
feature: FEAT-170
run_title: "FEAT170 SLICE87"
usd: 46.1498
duration_ms: 2980612
total_tokens: 22817601
cache_hit_pct: 98.5
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-10T08:40:42.393Z
---

# Cost Report: FEAT170 SLICE87

- Created: 2026-06-10T08:40:42.393Z
- Run Title: FEAT170 SLICE87
- Window Start: 2026-06-10T07:51:01.475Z
- Window End: 2026-06-10T08:40:42.087Z
- Duration: 49.7 min (2980612 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 127
- Total Tokens: 22,817,601
- Cache Hit %: 98.5%
- Total USD: $46.1498
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 70,681
- cache_create_5m: 0
- cache_create_1h: 268,960
- cache_read: 22,356,428
- output: 121,532

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 115 msgs (90.55%), $44.7426 (96.95%)
- claude-fable-5 (priced as claude-sonnet-4): 12 msgs (9.45%), $1.4072 (3.05%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 61
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 1
- subagent_dispatches: 5

## Tool Usage

- Bash: 27 (1 failed)
- Read: 7
- Agent: 5
- Edit: 5 (1 failed)
- Write: 3
- Grep: 2
- ToolSearch: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 50
- sum: 107,329
- p50: 290
- p90: 5,293
- max: 54,281

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\redundant-read-detector.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 7 calls, 64,525B results, ~85,435 cache_create tok (1.32×)
- Bash: 26 calls, 16,547B results, ~69,249 cache_create tok (4.18×)
- Agent: 5 calls, 14,489B results, ~61,238 cache_create tok (4.23×)
- Write: 3 calls, 556B results, ~17,051 cache_create tok (30.67×)
- Edit: 5 calls, 718B results, ~13,686 cache_create tok (19.06×)
- ToolSearch: 1 calls, 32B results, ~5,679 cache_create tok (177.47×)
- Grep: 2 calls, 1,247B results, ~3,974 cache_create tok (3.19×)


## By Model (token detail)

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 115
- usd: $44.7426
- input: 12,605
- cache_create_5m: 0
- cache_create_1h: 159,590
- cache_read: 21,376,985
- output: 102,671

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 12
- usd: $1.4072
- input: 58,076
- cache_create_5m: 0
- cache_create_1h: 109,370
- cache_read: 979,443
- output: 18,861

