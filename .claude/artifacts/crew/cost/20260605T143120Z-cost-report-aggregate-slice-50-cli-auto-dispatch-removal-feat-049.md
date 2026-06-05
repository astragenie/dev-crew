---
kind: cost-report
slice: SLICE-50
run_title: "SLICE-50: CLI auto-dispatch removal — FEAT-049"
usd: 117.101
duration_ms: 1744889
total_tokens: 62484847
cache_hit_pct: 99.4
review_decision: approved
validation_decision: passed
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-05T14:31:20.213Z
---

# Cost Report: SLICE-50: CLI auto-dispatch removal — FEAT-049

- Created: 2026-06-05T14:31:20.213Z
- Run Title: SLICE-50: CLI auto-dispatch removal — FEAT-049
- Window Start: 2026-06-05T14:02:12.976Z
- Window End: 2026-06-05T14:31:17.865Z
- Duration: 29.1 min (1744889 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 221
- Total Tokens: 62,484,847
- Cache Hit %: 99.4%
- Total USD: $117.1010
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 127 msgs, $59.9433
- C--work-mega-loop: 94 msgs, $57.1578

## Outcome Linkage

- Slice: SLICE-50
- Grade Avg: -
- Review Decision: approved
- Validation Decision: passed

## Tokens (totals)

- input: 336
- cache_create_5m: 0
- cache_create_1h: 386,642
- cache_read: 61,929,843
- output: 168,026

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 221 msgs (100%), $117.1010 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 48
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 9

## Tool Usage

- Bash: 52 (2 failed)
- Read: 23 (1 failed)
- Edit: 17 (2 failed)
- Agent: 9
- Glob: 7
- Write: 3
- Grep: 3
- ToolSearch: 1
- AskUserQuestion: 1

## Tool Result Sizes (bytes)

- count: 119
- sum: 132,038
- p50: 446
- p90: 2,563
- max: 16,055

## File Re-reads

- redundant_read_count: 6
- top paths:
  - 3× C:\work\mega\loop\src\scripts\loop.mts
  - 3× C:\work\mega\loopobserver\src\LoopBrain.Web\src\components\grades\DimensionDrilldown.tsx
  - 2× C:\work\mega\loopobserver\src\LoopBrain.Web\src\components\grades\DimensionDrilldown.test.tsx
  - 2× C:\work\mega\loopobserver\src\LoopBrain.Infrastructure\Observability\LoopBrainMetrics.cs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 52 calls, 61,074B results, ~165,086 cache_create tok (2.7×)
- Agent: 9 calls, 19,439B results, ~86,508 cache_create tok (4.45×)
- Read: 23 calls, 42,308B results, ~64,900 cache_create tok (1.53×)
- Edit: 17 calls, 2,911B results, ~26,408 cache_create tok (9.07×)
- Glob: 7 calls, 426B results, ~12,131 cache_create tok (28.48×)
- Write: 3 calls, 543B results, ~11,141 cache_create tok (20.52×)
- AskUserQuestion: 1 calls, 243B results, ~4,284 cache_create tok (17.63×)
- Grep: 3 calls, 696B results, ~3,663 cache_create tok (5.26×)
- ToolSearch: 1 calls, 32B results, ~932 cache_create tok (29.13×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 221
- usd: $117.1010
- input: 336
- cache_create_5m: 0
- cache_create_1h: 386,642
- cache_read: 61,929,843
- output: 168,026

