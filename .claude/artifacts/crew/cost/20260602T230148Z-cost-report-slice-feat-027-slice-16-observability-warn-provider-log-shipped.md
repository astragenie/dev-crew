---
kind: cost-report
slice: SLICE-16
run_title: "FEAT-027 SLICE-16 — observability warn + provider log — SHIPPED"
usd: 4.1386
duration_ms: 361069
total_tokens: 9046525
cache_hit_pct: 99.1
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-02T23:01:48.303Z
---

# Cost Report: FEAT-027 SLICE-16 — observability warn + provider log — SHIPPED

- Created: 2026-06-02T23:01:48.303Z
- Run Title: FEAT-027 SLICE-16 — observability warn + provider log — SHIPPED
- Window Start: 2026-06-02T22:55:47.116Z
- Window End: 2026-06-02T23:01:48.185Z
- Duration: 6.0 min (361069 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 44
- Total Tokens: 9,046,525
- Cache Hit %: 99.1%
- Total USD: $4.1386
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-16
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 341
- cache_create_5m: 55,784
- cache_create_1h: 22,883
- cache_read: 8,953,981
- output: 13,536

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 41 msgs (93.18%), $3.0113 (72.76%)
- claude-opus-4-7 (priced as claude-opus-4): 3 msgs (6.82%), $1.1273 (27.24%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 8000
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Read: 8
- Bash: 6
- Edit: 3
- Write: 2

## Tool Result Sizes (bytes)

- count: 19
- sum: 13,548
- p50: 531
- p90: 1,784
- max: 2,586

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 3× C:\work\mega\loop\src\tests\task-store-index.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 5 calls, 1,857B results, ~59,947 cache_create tok (32.28×)
- Read: 8 calls, 10,664B results, ~7,792 cache_create tok (0.73×)
- Edit: 3 calls, 463B results, ~6,093 cache_create tok (13.16×)
- Write: 2 calls, 385B results, ~2,918 cache_create tok (7.58×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 41
- usd: $3.0113
- input: 328
- cache_create_5m: 0
- cache_create_1h: 22,883
- cache_read: 8,926,548
- output: 13,003

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 3
- usd: $1.1273
- input: 13
- cache_create_5m: 55,784
- cache_create_1h: 0
- cache_read: 27,433
- output: 533

