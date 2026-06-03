---
kind: cost-report
run_title: "FEAT-006 SLICE-B — plan-mode conditional gate — SHIPPED"
usd: 3.4269
duration_ms: 1504198
total_tokens: 9945918
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-03T06:38:04.693Z
---

# Cost Report: FEAT-006 SLICE-B — plan-mode conditional gate — SHIPPED

- Created: 2026-06-03T06:38:04.693Z
- Run Title: FEAT-006 SLICE-B — plan-mode conditional gate — SHIPPED
- Window Start: 2026-06-03T06:13:00.338Z
- Window End: 2026-06-03T06:38:04.536Z
- Duration: 25.1 min (1504198 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 34
- Total Tokens: 9,945,918
- Cache Hit %: 99.7%
- Total USD: $3.4269
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 278
- cache_create_5m: 0
- cache_create_1h: 28,786
- cache_read: 9,897,922
- output: 18,932

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 34 msgs (100%), $3.4269 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 8
- Read: 2
- Agent: 2
- Write: 1
- Edit: 1

## Tool Result Sizes (bytes)

- count: 14
- sum: 14,203
- p50: 348
- p90: 1,742
- max: 8,439

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 1,811B results, ~14,556 cache_create tok (8.04×)
- Bash: 7 calls, 3,040B results, ~8,004 cache_create tok (2.63×)
- Write: 1 calls, 208B results, ~2,246 cache_create tok (10.8×)
- Edit: 1 calls, 178B results, ~1,000 cache_create tok (5.62×)
- Read: 2 calls, 8,787B results, ~592 cache_create tok (0.07×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 34
- usd: $3.4269
- input: 278
- cache_create_5m: 0
- cache_create_1h: 28,786
- cache_read: 9,897,922
- output: 18,932

