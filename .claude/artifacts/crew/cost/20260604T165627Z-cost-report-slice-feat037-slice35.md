---
kind: cost-report
feature: FEAT-037
run_title: "FEAT037 SLICE35"
usd: 8.3978
duration_ms: 467634
total_tokens: 4641333
cache_hit_pct: 99.5
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T16:56:27.273Z
---

# Cost Report: FEAT037 SLICE35

- Created: 2026-06-04T16:56:27.274Z
- Run Title: FEAT037 SLICE35
- Window Start: 2026-06-04T16:48:39.599Z
- Window End: 2026-06-04T16:56:27.233Z
- Duration: 7.8 min (467634 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 6
- Total Tokens: 4,641,333
- Cache Hit %: 99.5%
- Total USD: $8.3978
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 16
- cache_create_5m: 0
- cache_create_1h: 22,331
- cache_read: 4,608,113
- output: 10,873

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 6 msgs (100%), $8.3978 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Read: 1
- Write: 1
- Agent: 1
- Bash: 1

## Tool Result Sizes (bytes)

- count: 4
- sum: 1,771
- p50: 200
- p90: 1,462
- max: 1,462

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 1,462B results, ~17,172 cache_create tok (11.75×)
- Read: 1 calls, 72B results, ~1,888 cache_create tok (26.22×)
- Write: 1 calls, 200B results, ~944 cache_create tok (4.72×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 6
- usd: $8.3978
- input: 16
- cache_create_5m: 0
- cache_create_1h: 22,331
- cache_read: 4,608,113
- output: 10,873

