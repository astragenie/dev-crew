---
kind: cost-report
feature: FEAT-065
run_title: "FEAT065 SLICE61"
usd: 27.6753
duration_ms: 231926
total_tokens: 17288596
cache_hit_pct: 99.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-06T16:12:16.311Z
---

# Cost Report: FEAT065 SLICE61

- Created: 2026-06-06T16:12:16.311Z
- Run Title: FEAT065 SLICE61
- Window Start: 2026-06-06T16:08:15.557Z
- Window End: 2026-06-06T16:12:07.483Z
- Duration: 3.9 min (231926 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 22
- Total Tokens: 17,288,596
- Cache Hit %: 99.9%
- Total USD: $27.6753
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 22
- cache_create_5m: 0
- cache_create_1h: 18,850
- cache_read: 17,253,331
- output: 16,393

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 22 msgs (100%), $27.6753 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 5
- Read: 3
- Edit: 3
- Write: 2
- Grep: 1

## Tool Result Sizes (bytes)

- count: 14
- sum: 3,683
- p50: 146
- p90: 566
- max: 616

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 3× C:\work\mega\loop\src\scripts\loop.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Write: 2 calls, 291B results, ~6,238 cache_create tok (21.44×)
- Edit: 3 calls, 432B results, ~5,980 cache_create tok (13.84×)
- Bash: 4 calls, 1,063B results, ~3,901 cache_create tok (3.67×)
- Read: 3 calls, 1,571B results, ~1,987 cache_create tok (1.26×)
- Grep: 1 calls, 227B results, ~314 cache_create tok (1.38×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 22
- usd: $27.6753
- input: 22
- cache_create_5m: 0
- cache_create_1h: 18,850
- cache_read: 17,253,331
- output: 16,393

