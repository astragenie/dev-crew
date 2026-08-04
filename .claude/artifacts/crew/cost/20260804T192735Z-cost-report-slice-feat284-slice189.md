---
kind: cost-report
feature: FEAT-284
run_title: "FEAT284 SLICE189"
usd: 8.2738
duration_ms: 1927846
total_tokens: 22027306
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T19:27:35.886Z
---

# Cost Report: FEAT284 SLICE189

- Created: 2026-08-04T19:27:35.886Z
- Run Title: FEAT284 SLICE189
- Window Start: 2026-08-04T18:55:25.852Z
- Window End: 2026-08-04T19:27:33.698Z
- Duration: 32.1 min (1927846 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 66
- Total Tokens: 22,027,306
- Cache Hit %: 99.6%
- Total USD: $8.2738
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 132
- cache_create_5m: 0
- cache_create_1h: 92,017
- cache_read: 21,857,553
- output: 77,604

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 66 msgs (100%), $8.2738 (100%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 2032
- turns_before_first_tool: 0
- compaction_count: 1
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 18 (1 failed)
- Agent: 2
- Write: 2
- SendMessage: 1
- TaskCreate: 1
- Read: 1
- TaskUpdate: 1

## Tool Result Sizes (bytes)

- count: 26
- sum: 7,657
- p50: 230
- p90: 747
- max: 879

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 17 calls, 5,741B results, ~70,154 cache_create tok (12.22×)
- Agent: 2 calls, 612B results, ~9,686 cache_create tok (15.83×)
- SendMessage: 1 calls, 375B results, ~3,646 cache_create tok (9.72×)
- Write: 2 calls, 455B results, ~3,038 cache_create tok (6.68×)
- TaskCreate: 1 calls, 81B results, ~2,338 cache_create tok (28.86×)
- TaskUpdate: 1 calls, 36B results, ~1,988 cache_create tok (55.22×)
- Read: 1 calls, 105B results, ~591 cache_create tok (5.63×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 66
- usd: $8.2738
- input: 132
- cache_create_5m: 0
- cache_create_1h: 92,017
- cache_read: 21,857,553
- output: 77,604

