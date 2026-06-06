---
kind: cost-report
feature: FEAT-053
run_title: "FEAT053 SLICE53"
usd: 23.8763
duration_ms: 1122369
total_tokens: 13854421
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-06T12:10:45.570Z
---

# Cost Report: FEAT053 SLICE53

- Created: 2026-06-06T12:10:45.570Z
- Run Title: FEAT053 SLICE53
- Window Start: 2026-06-06T11:51:56.918Z
- Window End: 2026-06-06T12:10:39.287Z
- Duration: 18.7 min (1122369 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 45
- Total Tokens: 13,854,421
- Cache Hit %: 99.7%
- Total USD: $23.8763
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 55
- cache_create_5m: 0
- cache_create_1h: 39,506
- cache_read: 13,788,084
- output: 26,776

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 45 msgs (100%), $23.8763 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 17 (1 failed)
- Agent: 4
- Read: 3
- Edit: 2

## Tool Result Sizes (bytes)

- count: 26
- sum: 15,175
- p50: 417
- p90: 1,280
- max: 3,067

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\slice-linker\feature-lifecycle.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 4 calls, 4,629B results, ~19,133 cache_create tok (4.13×)
- Bash: 16 calls, 4,880B results, ~12,235 cache_create tok (2.51×)
- Read: 3 calls, 4,042B results, ~3,433 cache_create tok (0.85×)
- Edit: 2 calls, 344B results, ~2,551 cache_create tok (7.42×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 45
- usd: $23.8763
- input: 55
- cache_create_5m: 0
- cache_create_1h: 39,506
- cache_read: 13,788,084
- output: 26,776

