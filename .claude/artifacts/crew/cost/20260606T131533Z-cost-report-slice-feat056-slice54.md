---
kind: cost-report
feature: FEAT-056
run_title: "FEAT056 SLICE54"
usd: 63.3843
duration_ms: 1942476
total_tokens: 37346402
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-06T13:15:33.424Z
---

# Cost Report: FEAT056 SLICE54

- Created: 2026-06-06T13:15:33.424Z
- Run Title: FEAT056 SLICE54
- Window Start: 2026-06-06T12:43:03.180Z
- Window End: 2026-06-06T13:15:25.656Z
- Duration: 32.4 min (1942476 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 95
- Total Tokens: 37,346,402
- Cache Hit %: 99.7%
- Total USD: $63.3843
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 105
- cache_create_5m: 0
- cache_create_1h: 112,520
- cache_read: 37,177,227
- output: 56,550

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 95 msgs (100%), $63.3843 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 5

## Tool Usage

- Bash: 26
- Edit: 15
- Read: 12
- Agent: 5
- Grep: 4

## Tool Result Sizes (bytes)

- count: 62
- sum: 44,082
- p50: 473
- p90: 1,685
- max: 3,485

## File Re-reads

- redundant_read_count: 7
- top paths:
  - 5× C:\work\mega\loop\src\scripts\lib\auto-walker.mts
  - 4× C:\work\mega\loop\src\tests\session-drift.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 25 calls, 12,451B results, ~34,778 cache_create tok (2.79×)
- Agent: 5 calls, 8,034B results, ~32,428 cache_create tok (4.04×)
- Edit: 15 calls, 2,357B results, ~22,177 cache_create tok (9.41×)
- Read: 12 calls, 19,654B results, ~19,199 cache_create tok (0.98×)
- Grep: 4 calls, 1,067B results, ~2,843 cache_create tok (2.66×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 95
- usd: $63.3843
- input: 105
- cache_create_5m: 0
- cache_create_1h: 112,520
- cache_read: 37,177,227
- output: 56,550

