---
kind: cost-report
phase: "3"
feature: FEAT-071
run_title: "PHASE3 FEAT071 SLICE75"
usd: 48.923
duration_ms: 1928581
total_tokens: 24835124
cache_hit_pct: 98.6
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T13:44:49.279Z
---

# Cost Report: PHASE3 FEAT071 SLICE75

- Created: 2026-06-07T13:44:49.279Z
- Run Title: PHASE3 FEAT071 SLICE75
- Window Start: 2026-06-07T13:12:40.419Z
- Window End: 2026-06-07T13:44:49.000Z
- Duration: 32.1 min (1928581 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 180
- Total Tokens: 24,835,124
- Cache Hit %: 98.6%
- Total USD: $48.9230
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 437
- cache_create_5m: 0
- cache_create_1h: 337,125
- cache_read: 24,381,906
- output: 115,656

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 144 msgs (80%), $47.3119 (96.71%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 36 msgs (20%), $1.6111 (3.29%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 11
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 6

## Tool Usage

- Bash: 41 (2 failed)
- Edit: 19 (1 failed)
- TaskUpdate: 18
- Read: 12
- TaskCreate: 8
- Grep: 8
- Glob: 7
- Agent: 6
- Write: 2
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 123
- sum: 115,230
- p50: 179
- p90: 2,647
- max: 16,817

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\.claude\worktrees\fe-be-routing-fix\src\tests\slice-classify.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 12 calls, 43,844B results, ~61,792 cache_create tok (1.41×)
- TaskCreate: 8 calls, 534B results, ~59,504 cache_create tok (111.43×)
- Bash: 41 calls, 21,678B results, ~56,665 cache_create tok (2.61×)
- Agent: 6 calls, 9,446B results, ~40,495 cache_create tok (4.29×)
- Grep: 8 calls, 32,352B results, ~36,607 cache_create tok (1.13×)
- TaskUpdate: 17 calls, 386B results, ~36,603 cache_create tok (94.83×)
- Edit: 19 calls, 3,443B results, ~24,730 cache_create tok (7.18×)
- Glob: 7 calls, 683B results, ~12,406 cache_create tok (18.16×)
- Write: 2 calls, 405B results, ~3,793 cache_create tok (9.37×)
- ToolSearch: 1 calls, 52B results, ~2,618 cache_create tok (50.35×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 36
- usd: $1.6111
- input: 50
- cache_create_5m: 0
- cache_create_1h: 43,012
- cache_read: 3,231,192
- output: 25,568

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 144
- usd: $47.3119
- input: 387
- cache_create_5m: 0
- cache_create_1h: 294,113
- cache_read: 21,150,714
- output: 90,088

