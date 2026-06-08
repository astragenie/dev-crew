---
kind: cost-report
slice: SLICE-81
run_title: "orchestrate-slice: SLICE-81 conditional validator-first dispatch for short slices"
usd: 1.936
duration_ms: 2080033
total_tokens: 3870910
cache_hit_pct: 98.3
review_decision: approved
validation_decision: passed
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T23:31:41.721Z
---

# Cost Report: orchestrate-slice: SLICE-81 conditional validator-first dispatch for short slices

- Created: 2026-06-07T23:31:41.721Z
- Run Title: orchestrate-slice: SLICE-81 conditional validator-first dispatch for short slices
- Window Start: 2026-06-07T22:57:01.200Z
- Window End: 2026-06-07T23:31:41.233Z
- Duration: 34.7 min (2080033 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 50
- Total Tokens: 3,870,910
- Cache Hit %: 98.3%
- Total USD: $1.9360
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-81
- Grade Avg: -
- Review Decision: approved
- Validation Decision: passed

## Tokens (totals)

- input: 76
- cache_create_5m: 0
- cache_create_1h: 63,644
- cache_read: 3,779,179
- output: 28,011

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 50 msgs (100%), $1.9360 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 38
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 12

## Tool Usage

- Agent: 12
- PowerShell: 5 (3 failed)
- Skill: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 20
- sum: 21,717
- p50: 1,228
- p90: 2,548
- max: 2,674

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 12 calls, 15,980B results, ~35,067 cache_create tok (2.19×)
- Skill: 1 calls, 39B results, ~18,399 cache_create tok (471.77×)
- PowerShell: 5 calls, 708B results, ~5,209 cache_create tok (7.36×)
- Read: 1 calls, 2,548B results, ~2,943 cache_create tok (1.16×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 50
- usd: $1.9360
- input: 76
- cache_create_5m: 0
- cache_create_1h: 63,644
- cache_read: 3,779,179
- output: 28,011

