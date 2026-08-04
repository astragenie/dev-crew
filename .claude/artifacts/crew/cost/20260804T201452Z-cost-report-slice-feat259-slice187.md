---
kind: cost-report
feature: FEAT-259
run_title: "FEAT259 SLICE187"
usd: 4.9604
duration_ms: 1463725
total_tokens: 14037684
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T20:14:52.028Z
---

# Cost Report: FEAT259 SLICE187

- Created: 2026-08-04T20:14:52.028Z
- Run Title: FEAT259 SLICE187
- Window Start: 2026-08-04T19:50:27.447Z
- Window End: 2026-08-04T20:14:51.172Z
- Duration: 24.4 min (1463725 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 34
- Total Tokens: 14,037,684
- Cache Hit %: 99.6%
- Total USD: $4.9604
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 68
- cache_create_5m: 0
- cache_create_1h: 49,571
- cache_read: 13,956,320
- output: 31,725

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 34 msgs (100%), $4.9604 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 623
- turns_before_first_tool: 0
- compaction_count: 3
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 10
- Agent: 2
- Read: 1

## Tool Result Sizes (bytes)

- count: 14
- sum: 4,634
- p50: 285
- p90: 855
- max: 1,129

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 10 calls, 3,376B results, ~38,929 cache_create tok (11.53×)
- Agent: 2 calls, 612B results, ~9,200 cache_create tok (15.03×)
- Read: 1 calls, 361B results, ~668 cache_create tok (1.85×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 34
- usd: $4.9604
- input: 68
- cache_create_5m: 0
- cache_create_1h: 49,571
- cache_read: 13,956,320
- output: 31,725

