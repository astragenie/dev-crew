---
kind: cost-report
slice: SLICE-16
run_title: "FEAT-027 SLICE-16 — observability warn + provider log — SHIPPED"
usd: 5.0211
duration_ms: 361069
total_tokens: 11623055
cache_hit_pct: 99.3
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-02T23:01:53.590Z
---

# Cost Report: FEAT-027 SLICE-16 — observability warn + provider log — SHIPPED

- Created: 2026-06-02T23:01:53.590Z
- Run Title: FEAT-027 SLICE-16 — observability warn + provider log — SHIPPED
- Window Start: 2026-06-02T22:55:47.116Z
- Window End: 2026-06-02T23:01:48.185Z
- Duration: 6.0 min (361069 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 58
- Total Tokens: 11,623,055
- Cache Hit %: 99.3%
- Total USD: $5.0211
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 44 msgs, $4.1386
- C--work-mega-common: 14 msgs, $0.8826

## Outcome Linkage

- Slice: SLICE-16
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 461
- cache_create_5m: 55,784
- cache_create_1h: 29,351
- cache_read: 11,518,997
- output: 18,462

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 55 msgs (94.83%), $3.8939 (77.55%)
- claude-opus-4-7 (priced as claude-opus-4): 3 msgs (5.17%), $1.1273 (22.45%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 8000
- turns_before_first_tool: 1
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Read: 8
- Bash: 6
- PowerShell: 3
- Edit: 3
- Write: 2
- ScheduleWakeup: 1

## Tool Result Sizes (bytes)

- count: 23
- sum: 14,082
- p50: 217
- p90: 1,628
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
- PowerShell: 3 calls, 377B results, ~5,375 cache_create tok (14.26×)
- Write: 2 calls, 385B results, ~2,918 cache_create tok (7.58×)
- ScheduleWakeup: 1 calls, 157B results, ~2,082 cache_create tok (13.26×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 55
- usd: $3.8939
- input: 448
- cache_create_5m: 0
- cache_create_1h: 29,351
- cache_read: 11,491,564
- output: 17,929

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 3
- usd: $1.1273
- input: 13
- cache_create_5m: 55,784
- cache_create_1h: 0
- cache_read: 27,433
- output: 533

