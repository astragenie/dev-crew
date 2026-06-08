---
kind: cost-report
feature: FEAT-054
run_title: "FEAT054 SLICE81"
usd: 1.9679
duration_ms: 2080033
total_tokens: 3957385
cache_hit_pct: 98.4
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-08T03:34:37.584Z
---

# Cost Report: FEAT054 SLICE81

- Created: 2026-06-08T03:34:37.584Z
- Run Title: FEAT054 SLICE81
- Window Start: 2026-06-07T22:57:01.200Z
- Window End: 2026-06-07T23:31:41.233Z
- Duration: 34.7 min (2080033 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 51
- Total Tokens: 3,957,385
- Cache Hit %: 98.4%
- Total USD: $1.9679
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 77
- cache_create_5m: 0
- cache_create_1h: 63,845
- cache_read: 3,865,123
- output: 28,340

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 51 msgs (100%), $1.9679 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 38
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 12

## Tool Usage

- Agent: 12
- PowerShell: 6 (3 failed)
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
- PowerShell: 5 calls, 708B results, ~5,410 cache_create tok (7.64×)
- Read: 1 calls, 2,548B results, ~2,943 cache_create tok (1.16×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 51
- usd: $1.9679
- input: 77
- cache_create_5m: 0
- cache_create_1h: 63,845
- cache_read: 3,865,123
- output: 28,340

