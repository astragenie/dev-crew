---
kind: cost-report
feature: FEAT-083
run_title: "FEAT083 SLICE89"
usd: 10.3107
duration_ms: 1089787
total_tokens: 3298766
cache_hit_pct: 97.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-10T23:28:07.559Z
---

# Cost Report: FEAT083 SLICE89

- Created: 2026-06-10T23:28:07.559Z
- Run Title: FEAT083 SLICE89
- Window Start: 2026-06-10T23:09:57.465Z
- Window End: 2026-06-10T23:28:07.252Z
- Duration: 18.2 min (1089787 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 31
- Total Tokens: 3,298,766
- Cache Hit %: 97.8%
- Total USD: $10.3107
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 66
- cache_create_5m: 0
- cache_create_1h: 70,682
- cache_read: 3,182,477
- output: 45,541

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 31 msgs (100%), $10.3107 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Read: 5
- Agent: 4
- TaskUpdate: 2
- TaskCreate: 2
- Grep: 2
- Bash: 2
- AskUserQuestion: 1

## Tool Result Sizes (bytes)

- count: 19
- sum: 26,906
- p50: 863
- p90: 3,488
- max: 5,845

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\auto-dispatch.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 4 calls, 5,543B results, ~27,408 cache_create tok (4.94×)
- Read: 5 calls, 16,150B results, ~18,765 cache_create tok (1.16×)
- AskUserQuestion: 1 calls, 456B results, ~8,790 cache_create tok (19.28×)
- Bash: 2 calls, 421B results, ~4,153 cache_create tok (9.86×)
- TaskUpdate: 2 calls, 44B results, ~2,811 cache_create tok (63.89×)
- TaskCreate: 2 calls, 110B results, ~2,811 cache_create tok (25.55×)
- Grep: 2 calls, 923B results, ~1,183 cache_create tok (1.28×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 31
- usd: $10.3107
- input: 66
- cache_create_5m: 0
- cache_create_1h: 70,682
- cache_read: 3,182,477
- output: 45,541

