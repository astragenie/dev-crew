---
kind: cost-report
feature: FEAT-199
run_title: "FEAT199 SLICE114"
usd: 11.623
duration_ms: 188201
total_tokens: 7097698
cache_hit_pct: 99.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T15:35:04.524Z
---

# Cost Report: FEAT199 SLICE114

- Created: 2026-06-12T15:35:04.524Z
- Run Title: FEAT199 SLICE114
- Window Start: 2026-06-12T15:31:55.716Z
- Window End: 2026-06-12T15:35:03.917Z
- Duration: 3.1 min (188201 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 8
- Total Tokens: 7,097,698
- Cache Hit %: 99.9%
- Total USD: $11.6230
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 8
- cache_create_5m: 0
- cache_create_1h: 8,761
- cache_read: 7,079,042
- output: 9,887

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 8 msgs (100%), $11.6230 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Edit: 4
- Bash: 2
- Read: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 8
- sum: 1,205
- p50: 156
- p90: 207
- max: 207

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Edit: 4 calls, 606B results, ~4,393 cache_create tok (7.25×)
- Bash: 1 calls, 180B results, ~1,811 cache_create tok (10.06×)
- Read: 1 calls, 78B results, ~844 cache_create tok (10.82×)
- Write: 1 calls, 134B results, ~844 cache_create tok (6.3×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 8
- usd: $11.6230
- input: 8
- cache_create_5m: 0
- cache_create_1h: 8,761
- cache_read: 7,079,042
- output: 9,887

