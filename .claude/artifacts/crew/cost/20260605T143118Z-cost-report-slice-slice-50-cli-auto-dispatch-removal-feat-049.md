---
kind: cost-report
slice: SLICE-50
run_title: "SLICE-50: CLI auto-dispatch removal — FEAT-049"
usd: 57.1578
duration_ms: 1744889
total_tokens: 31162596
cache_hit_pct: 99.5
review_decision: approved
validation_decision: passed
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T14:31:18.030Z
---

# Cost Report: SLICE-50: CLI auto-dispatch removal — FEAT-049

- Created: 2026-06-05T14:31:18.030Z
- Run Title: SLICE-50: CLI auto-dispatch removal — FEAT-049
- Window Start: 2026-06-05T14:02:12.976Z
- Window End: 2026-06-05T14:31:17.865Z
- Duration: 29.1 min (1744889 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 94
- Total Tokens: 31,162,596
- Cache Hit %: 99.5%
- Total USD: $57.1578
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-50
- Grade Avg: -
- Review Decision: approved
- Validation Decision: passed

## Tokens (totals)

- input: 164
- cache_create_5m: 0
- cache_create_1h: 164,625
- cache_read: 30,919,986
- output: 77,821

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 94 msgs (100%), $57.1578 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 48
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 5

## Tool Usage

- Bash: 27
- Edit: 7 (2 failed)
- Read: 6 (1 failed)
- Agent: 5
- Write: 2
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 50
- sum: 43,614
- p50: 475
- p90: 1,813
- max: 6,743

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 3× C:\work\mega\loop\src\scripts\loop.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 27 calls, 25,138B results, ~80,689 cache_create tok (3.21×)
- Agent: 5 calls, 8,395B results, ~48,357 cache_create tok (5.76×)
- Edit: 7 calls, 927B results, ~11,992 cache_create tok (12.94×)
- Read: 6 calls, 5,577B results, ~8,975 cache_create tok (1.61×)
- Write: 2 calls, 348B results, ~2,091 cache_create tok (6.01×)
- ToolSearch: 1 calls, 32B results, ~932 cache_create tok (29.13×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 94
- usd: $57.1578
- input: 164
- cache_create_5m: 0
- cache_create_1h: 164,625
- cache_read: 30,919,986
- output: 77,821

