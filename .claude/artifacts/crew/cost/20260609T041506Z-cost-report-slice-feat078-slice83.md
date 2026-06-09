---
kind: cost-report
feature: FEAT-078
run_title: "FEAT078 SLICE83"
usd: 16.0366
duration_ms: 1106358
total_tokens: 11143960
cache_hit_pct: 99.3
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-09T04:15:06.420Z
---

# Cost Report: FEAT078 SLICE83

- Created: 2026-06-09T04:15:06.420Z
- Run Title: FEAT078 SLICE83
- Window Start: 2026-06-09T03:56:30.419Z
- Window End: 2026-06-09T04:14:56.777Z
- Duration: 18.4 min (1106358 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 64
- Total Tokens: 11,143,960
- Cache Hit %: 99.3%
- Total USD: $16.0366
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 178
- cache_create_5m: 0
- cache_create_1h: 74,725
- cache_read: 11,020,203
- output: 48,854

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 34 msgs (53.13%), $14.4361 (90.02%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 30 msgs (46.88%), $1.6005 (9.98%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 25
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 9

## Tool Usage

- Bash: 20 (1 failed)
- Agent: 9
- Glob: 2
- Grep: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 33
- sum: 33,910
- p50: 618
- p90: 2,727
- max: 4,691

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 19 calls, 19,784B results, ~33,865 cache_create tok (1.71×)
- Agent: 9 calls, 11,121B results, ~31,334 cache_create tok (2.82×)
- Glob: 2 calls, 28B results, ~3,730 cache_create tok (133.21×)
- Grep: 1 calls, 490B results, ~1,960 cache_create tok (4×)
- Write: 1 calls, 209B results, ~1,870 cache_create tok (8.95×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 30
- usd: $1.6005
- input: 56
- cache_create_5m: 0
- cache_create_1h: 27,724
- cache_read: 3,704,619
- output: 21,509

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 34
- usd: $14.4361
- input: 122
- cache_create_5m: 0
- cache_create_1h: 47,001
- cache_read: 7,315,584
- output: 27,345

