---
kind: cost-report
run_title: "FEAT-006 SLICE-B — plan-mode conditional gate — SHIPPED"
usd: 14.5306
duration_ms: 1504198
total_tokens: 30364548
cache_hit_pct: 97.9
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-03T06:38:10.384Z
---

# Cost Report: FEAT-006 SLICE-B — plan-mode conditional gate — SHIPPED

- Created: 2026-06-03T06:38:10.385Z
- Run Title: FEAT-006 SLICE-B — plan-mode conditional gate — SHIPPED
- Window Start: 2026-06-03T06:13:00.338Z
- Window End: 2026-06-03T06:38:04.536Z
- Duration: 25.1 min (1504198 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 133
- Total Tokens: 30,364,548
- Cache Hit %: 97.9%
- Total USD: $14.5306
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-common: 99 msgs, $11.1037
- C--work-mega-loop: 34 msgs, $3.4269

## Tokens (totals)

- input: 1,090
- cache_create_5m: 0
- cache_create_1h: 646,473
- cache_read: 29,599,067
- output: 117,918

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 133 msgs (100%), $14.5306 (100%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 228
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 16
- Read: 16
- Edit: 14
- PowerShell: 11
- Agent: 2
- ScheduleWakeup: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 61
- sum: 51,424
- p50: 348
- p90: 1,742
- max: 8,439

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loopobserver\src\LoopBrain.Worker\Dockerfile

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- PowerShell: 11 calls, 8,124B results, ~478,400 cache_create tok (58.89×)
- Read: 16 calls, 23,829B results, ~59,038 cache_create tok (2.48×)
- Edit: 14 calls, 2,313B results, ~52,477 cache_create tok (22.69×)
- Bash: 15 calls, 14,803B results, ~36,736 cache_create tok (2.48×)
- Agent: 2 calls, 1,811B results, ~14,556 cache_create tok (8.04×)
- Write: 1 calls, 208B results, ~2,246 cache_create tok (10.8×)
- ScheduleWakeup: 1 calls, 157B results, ~1,598 cache_create tok (10.18×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 133
- usd: $14.5306
- input: 1,090
- cache_create_5m: 0
- cache_create_1h: 646,473
- cache_read: 29,599,067
- output: 117,918

