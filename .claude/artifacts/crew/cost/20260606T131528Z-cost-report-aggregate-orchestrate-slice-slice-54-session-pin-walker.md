---
kind: cost-report
slice: SLICE-54
run_title: "orchestrate-slice: SLICE-54 Session-pin walker"
usd: 85.3325
duration_ms: 1942476
total_tokens: 50620995
cache_hit_pct: 99.7
review_decision: approved_with_notes
validation_decision: PASS
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-06T13:15:28.085Z
---

# Cost Report: orchestrate-slice: SLICE-54 Session-pin walker

- Created: 2026-06-06T13:15:28.085Z
- Run Title: orchestrate-slice: SLICE-54 Session-pin walker
- Window Start: 2026-06-06T12:43:03.180Z
- Window End: 2026-06-06T13:15:25.656Z
- Duration: 32.4 min (1942476 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 129
- Total Tokens: 50,620,995
- Cache Hit %: 99.7%
- Total USD: $85.3325
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 94 msgs, $62.6471
- C--work-mega-loopobserver: 35 msgs, $22.6854

## Outcome Linkage

- Slice: SLICE-54
- Grade Avg: -
- Review Decision: approved_with_notes
- Validation Decision: PASS

## Tokens (totals)

- input: 149
- cache_create_5m: 0
- cache_create_1h: 132,237
- cache_read: 50,412,007
- output: 76,602

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 129 msgs (100%), $85.3325 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 587
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 6

## Tool Usage

- Bash: 37 (1 failed)
- Edit: 18
- Read: 17 (1 failed)
- Agent: 6
- Grep: 4
- TaskUpdate: 2
- TaskCreate: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 88
- sum: 52,434
- p50: 288
- p90: 1,664
- max: 3,485

## File Re-reads

- redundant_read_count: 7
- top paths:
  - 5× C:\work\mega\loop\src\scripts\lib\auto-walker.mts
  - 4× C:\work\mega\loop\src\tests\session-drift.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 37 calls, 14,790B results, ~42,846 cache_create tok (2.9×)
- Agent: 6 calls, 8,916B results, ~34,769 cache_create tok (3.9×)
- Edit: 18 calls, 3,075B results, ~25,585 cache_create tok (8.32×)
- Read: 17 calls, 23,636B results, ~23,092 cache_create tok (0.98×)
- Grep: 4 calls, 1,067B results, ~2,843 cache_create tok (2.66×)
- TaskUpdate: 2 calls, 44B results, ~1,404 cache_create tok (31.91×)
- TaskCreate: 1 calls, 49B results, ~315 cache_create tok (6.43×)
- Write: 1 calls, 195B results, ~288 cache_create tok (1.48×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 129
- usd: $85.3325
- input: 149
- cache_create_5m: 0
- cache_create_1h: 132,237
- cache_read: 50,412,007
- output: 76,602

