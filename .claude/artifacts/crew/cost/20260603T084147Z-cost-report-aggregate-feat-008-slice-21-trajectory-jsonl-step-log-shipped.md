---
kind: cost-report
slice: SLICE-21
run_title: "FEAT-008 SLICE-21 — trajectory JSONL step log — SHIPPED"
usd: 12.9439
duration_ms: 1513335
total_tokens: 33542693
cache_hit_pct: 99.4
review_decision: approved
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-03T08:41:47.230Z
---

# Cost Report: FEAT-008 SLICE-21 — trajectory JSONL step log — SHIPPED

- Created: 2026-06-03T08:41:47.230Z
- Run Title: FEAT-008 SLICE-21 — trajectory JSONL step log — SHIPPED
- Window Start: 2026-06-03T08:16:28.724Z
- Window End: 2026-06-03T08:41:42.059Z
- Duration: 25.2 min (1513335 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 116
- Total Tokens: 33,542,693
- Cache Hit %: 99.4%
- Total USD: $12.9439
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 65 msgs, $7.7425
- C--work-mega-devops: 51 msgs, $5.2014

## Outcome Linkage

- Slice: SLICE-21
- Grade Avg: -
- Review Decision: approved
- Validation Decision: -

## Tokens (totals)

- input: 940
- cache_create_5m: 0
- cache_create_1h: 197,321
- cache_read: 33,225,125
- output: 119,307

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 116 msgs (100%), $12.9439 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- PowerShell: 20 (1 failed)
- Bash: 11
- Read: 6
- Edit: 6 (1 failed)
- Agent: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 45
- sum: 46,260
- p50: 238
- p90: 1,168
- max: 10,916

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\slice-linker\start-slice.mts
  - 2× C:\work\mega\loop\src\scripts\lib\slice-linker\complete-slice.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- PowerShell: 19 calls, 37,280B results, ~143,791 cache_create tok (3.86×)
- Bash: 10 calls, 4,593B results, ~17,791 cache_create tok (3.87×)
- Edit: 6 calls, 952B results, ~17,015 cache_create tok (17.87×)
- Agent: 2 calls, 555B results, ~11,538 cache_create tok (20.79×)
- Read: 6 calls, 2,498B results, ~4,638 cache_create tok (1.86×)
- Write: 1 calls, 207B results, ~1,180 cache_create tok (5.7×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 116
- usd: $12.9439
- input: 940
- cache_create_5m: 0
- cache_create_1h: 197,321
- cache_read: 33,225,125
- output: 119,307

