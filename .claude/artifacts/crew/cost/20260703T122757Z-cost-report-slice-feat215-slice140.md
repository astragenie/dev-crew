---
kind: cost-report
feature: FEAT-215
run_title: "FEAT215 SLICE140"
usd: 24.0312
duration_ms: 5851221
total_tokens: 12785105
cache_hit_pct: 99.4
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-03T12:27:57.480Z
---

# Cost Report: FEAT215 SLICE140

- Created: 2026-07-03T12:27:57.480Z
- Run Title: FEAT215 SLICE140
- Window Start: 2026-07-03T10:50:26.134Z
- Window End: 2026-07-03T12:27:57.355Z
- Duration: 97.5 min (5851221 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 35
- Total Tokens: 12,785,105
- Cache Hit %: 99.4%
- Total USD: $24.0312
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 13,042
- cache_create_5m: 0
- cache_create_1h: 57,118
- cache_read: 12,673,453
- output: 41,492

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 35 msgs (100%), $24.0312 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 29
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Agent: 4
- Bash: 4
- Read: 3
- Edit: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 15
- sum: 30,599
- p50: 1,465
- p90: 2,928
- max: 10,786

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\runner-plugin\src\tests\astrarunner-ingest.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 4 calls, 9,170B results, ~25,861 cache_create tok (2.82×)
- Read: 3 calls, 6,440B results, ~17,376 cache_create tok (2.7×)
- Bash: 4 calls, 3,662B results, ~8,513 cache_create tok (2.32×)
- Edit: 2 calls, 354B results, ~4,641 cache_create tok (13.11×)
- Write: 1 calls, 187B results, ~727 cache_create tok (3.89×)


## By Model (token detail)

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 35
- usd: $24.0312
- input: 13,042
- cache_create_5m: 0
- cache_create_1h: 57,118
- cache_read: 12,673,453
- output: 41,492

