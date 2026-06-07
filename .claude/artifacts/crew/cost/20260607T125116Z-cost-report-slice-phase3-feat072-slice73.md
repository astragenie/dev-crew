---
kind: cost-report
phase: "3"
feature: FEAT-072
run_title: "PHASE3 FEAT072 SLICE73"
usd: 0.948
duration_ms: 730348
total_tokens: 2537281
cache_hit_pct: 99.4
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T12:51:16.866Z
---

# Cost Report: PHASE3 FEAT072 SLICE73

- Created: 2026-06-07T12:51:16.866Z
- Run Title: PHASE3 FEAT072 SLICE73
- Window Start: 2026-06-07T12:39:06.227Z
- Window End: 2026-06-07T12:51:16.575Z
- Duration: 12.2 min (730348 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 19
- Total Tokens: 2,537,281
- Cache Hit %: 99.4%
- Total USD: $0.9480
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 29
- cache_create_5m: 0
- cache_create_1h: 14,085
- cache_read: 2,515,924
- output: 7,243

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 19 msgs (100%), $0.9480 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 6 (1 failed)
- Agent: 2
- Grep: 1
- Read: 1
- Edit: 1

## Tool Result Sizes (bytes)

- count: 12
- sum: 10,307
- p50: 430
- p90: 2,422
- max: 2,809

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 3,662B results, ~7,524 cache_create tok (2.05×)
- Bash: 6 calls, 3,258B results, ~3,646 cache_create tok (1.12×)
- Edit: 1 calls, 152B results, ~371 cache_create tok (2.44×)
- Grep: 1 calls, 430B results, ~351 cache_create tok (0.82×)
- Read: 1 calls, 383B results, ~249 cache_create tok (0.65×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 19
- usd: $0.9480
- input: 29
- cache_create_5m: 0
- cache_create_1h: 14,085
- cache_read: 2,515,924
- output: 7,243

