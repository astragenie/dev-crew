---
kind: cost-report
slice: SLICE-21
run_title: "FEAT-008 SLICE-21 — trajectory JSONL step log — SHIPPED"
usd: 7.7425
duration_ms: 1513335
total_tokens: 23609121
cache_hit_pct: 99.8
review_decision: approved
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-03T08:41:42.206Z
---

# Cost Report: FEAT-008 SLICE-21 — trajectory JSONL step log — SHIPPED

- Created: 2026-06-03T08:41:42.206Z
- Run Title: FEAT-008 SLICE-21 — trajectory JSONL step log — SHIPPED
- Window Start: 2026-06-03T08:16:28.724Z
- Window End: 2026-06-03T08:41:42.059Z
- Duration: 25.2 min (1513335 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 65
- Total Tokens: 23,609,121
- Cache Hit %: 99.8%
- Total USD: $7.7425
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-21
- Grade Avg: -
- Review Decision: approved
- Validation Decision: -

## Tokens (totals)

- input: 532
- cache_create_5m: 0
- cache_create_1h: 53,980
- cache_read: 23,530,756
- output: 23,853

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 65 msgs (100%), $7.7425 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 11
- Read: 6
- Edit: 6 (1 failed)
- Agent: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 26
- sum: 8,980
- p50: 222
- p90: 887
- max: 1,168

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\slice-linker\start-slice.mts
  - 2× C:\work\mega\loop\src\scripts\lib\slice-linker\complete-slice.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 10 calls, 4,593B results, ~17,791 cache_create tok (3.87×)
- Edit: 6 calls, 952B results, ~17,015 cache_create tok (17.87×)
- Agent: 2 calls, 555B results, ~11,538 cache_create tok (20.79×)
- Read: 6 calls, 2,498B results, ~4,638 cache_create tok (1.86×)
- Write: 1 calls, 207B results, ~1,180 cache_create tok (5.7×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 65
- usd: $7.7425
- input: 532
- cache_create_5m: 0
- cache_create_1h: 53,980
- cache_read: 23,530,756
- output: 23,853

