---
kind: cost-report
phase: "2"
feature: FEAT-010
run_title: "PHASE2 FEAT010 SLICE36"
usd: 2.6456
duration_ms: 435930
total_tokens: 3858977
cache_hit_pct: 94.0
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T06:57:27.415Z
---

# Cost Report: PHASE2 FEAT010 SLICE36

- Created: 2026-06-05T06:57:27.415Z
- Run Title: PHASE2 FEAT010 SLICE36
- Window Start: 2026-06-05T06:50:11.381Z
- Window End: 2026-06-05T06:57:27.311Z
- Duration: 7.3 min (435930 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 52
- Total Tokens: 3,858,977
- Cache Hit %: 94.0%
- Total USD: $2.6456
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 58
- cache_create_5m: 0
- cache_create_1h: 229,559
- cache_read: 3,617,166
- output: 12,194

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 52 msgs (100%), $2.6456 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 7
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 26 (8 failed)
- Read: 3
- Edit: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 33
- sum: 32,279
- p50: 195
- p90: 4,144
- max: 5,809

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\.claude\artifacts\loop\grades\20260605T065137Z-feat041-slice43-grade.md

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 26 calls, 24,529B results, ~219,912 cache_create tok (8.97×)
- Read: 3 calls, 3,743B results, ~3,809 cache_create tok (1.02×)
- Edit: 2 calls, 390B results, ~1,711 cache_create tok (4.39×)
- Write: 1 calls, 221B results, ~644 cache_create tok (2.91×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 52
- usd: $2.6456
- input: 58
- cache_create_5m: 0
- cache_create_1h: 229,559
- cache_read: 3,617,166
- output: 12,194

