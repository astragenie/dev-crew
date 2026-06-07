---
kind: cost-report
phase: "3"
feature: FEAT-071
run_title: "PHASE3 FEAT071 SLICE76"
usd: 17.6208
duration_ms: 2834545
total_tokens: 7897794
cache_hit_pct: 94.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T14:35:32.966Z
---

# Cost Report: PHASE3 FEAT071 SLICE76

- Created: 2026-06-07T14:35:32.966Z
- Run Title: PHASE3 FEAT071 SLICE76
- Window Start: 2026-06-07T13:48:18.144Z
- Window End: 2026-06-07T14:35:32.689Z
- Duration: 47.2 min (2834545 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 53
- Total Tokens: 7,897,794
- Cache Hit %: 94.9%
- Total USD: $17.6208
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 115
- cache_create_5m: 0
- cache_create_1h: 396,968
- cache_read: 7,458,855
- output: 41,856

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 17 msgs (32.08%), $15.4664 (87.77%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 36 msgs (67.92%), $2.1544 (12.23%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 29
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 6

## Tool Usage

- Bash: 10 (1 failed)
- Agent: 6
- Read: 4
- ToolSearch: 1
- ExitWorktree: 1

## Tool Result Sizes (bytes)

- count: 23
- sum: 24,428
- p50: 791
- p90: 2,368
- max: 3,645

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\backlog-parser.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 10 calls, 3,286B results, ~350,284 cache_create tok (106.6×)
- Agent: 6 calls, 10,500B results, ~29,058 cache_create tok (2.77×)
- Read: 4 calls, 8,074B results, ~12,464 cache_create tok (1.54×)
- ToolSearch: 1 calls, 54B results, ~2,156 cache_create tok (39.93×)
- ExitWorktree: 1 calls, 146B results, ~234 cache_create tok (1.6×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 36
- usd: $2.1544
- input: 48
- cache_create_5m: 0
- cache_create_1h: 47,411
- cache_read: 4,579,714
- output: 33,056

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 17
- usd: $15.4664
- input: 67
- cache_create_5m: 0
- cache_create_1h: 349,557
- cache_read: 2,879,141
- output: 8,800

