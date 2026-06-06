---
kind: cost-report
slice: SLICE-54
run_title: "orchestrate-slice: SLICE-54 Session-pin walker"
usd: 62.6471
duration_ms: 1942476
total_tokens: 36922588
cache_hit_pct: 99.7
review_decision: approved_with_notes
validation_decision: PASS
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-06T13:15:25.895Z
---

# Cost Report: orchestrate-slice: SLICE-54 Session-pin walker

- Created: 2026-06-06T13:15:25.895Z
- Run Title: orchestrate-slice: SLICE-54 Session-pin walker
- Window Start: 2026-06-06T12:43:03.180Z
- Window End: 2026-06-06T13:15:25.656Z
- Duration: 32.4 min (1942476 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 94
- Total Tokens: 36,922,588
- Cache Hit %: 99.7%
- Total USD: $62.6471
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-54
- Grade Avg: -
- Review Decision: approved_with_notes
- Validation Decision: PASS

## Tokens (totals)

- input: 104
- cache_create_5m: 0
- cache_create_1h: 111,210
- cache_read: 36,755,596
- output: 55,678

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 94 msgs (100%), $62.6471 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 5

## Tool Usage

- Bash: 25
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
- Agent: 5 calls, 8,034B results, ~31,118 cache_create tok (3.87×)
- Edit: 15 calls, 2,357B results, ~22,177 cache_create tok (9.41×)
- Read: 12 calls, 19,654B results, ~19,199 cache_create tok (0.98×)
- Grep: 4 calls, 1,067B results, ~2,843 cache_create tok (2.66×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 94
- usd: $62.6471
- input: 104
- cache_create_5m: 0
- cache_create_1h: 111,210
- cache_read: 36,755,596
- output: 55,678

