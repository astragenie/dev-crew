---
kind: cost-report
feature: FEAT-188
run_title: "FEAT188 SLICE102"
usd: 34.2109
duration_ms: 1745584
total_tokens: 18373047
cache_hit_pct: 99.6
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T10:40:02.140Z
---

# Cost Report: FEAT188 SLICE102

- Created: 2026-06-12T10:40:02.140Z
- Run Title: FEAT188 SLICE102
- Window Start: 2026-06-12T10:10:56.088Z
- Window End: 2026-06-12T10:40:01.672Z
- Duration: 29.1 min (1745584 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 50
- Total Tokens: 18,373,047
- Cache Hit %: 99.6%
- Total USD: $34.2109
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 80
- cache_create_5m: 0
- cache_create_1h: 74,010
- cache_read: 18,237,175
- output: 61,782

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 50 msgs (100%), $34.2109 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 54
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 14
- Edit: 9
- Read: 6
- Write: 2

## Tool Result Sizes (bytes)

- count: 32
- sum: 22,511
- p50: 168
- p90: 1,505
- max: 6,458

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\grade-writer.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 14 calls, 8,881B results, ~37,049 cache_create tok (4.17×)
- Edit: 9 calls, 1,392B results, ~20,471 cache_create tok (14.71×)
- Read: 6 calls, 5,478B results, ~6,239 cache_create tok (1.14×)
- Write: 2 calls, 302B results, ~537 cache_create tok (1.78×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 50
- usd: $34.2109
- input: 80
- cache_create_5m: 0
- cache_create_1h: 74,010
- cache_read: 18,237,175
- output: 61,782

