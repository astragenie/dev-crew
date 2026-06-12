---
kind: cost-report
feature: FEAT-198
run_title: "FEAT198 SLICE113"
usd: 11.056
duration_ms: 175610
total_tokens: 6792184
cache_hit_pct: 99.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T15:15:04.410Z
---

# Cost Report: FEAT198 SLICE113

- Created: 2026-06-12T15:15:04.410Z
- Run Title: FEAT198 SLICE113
- Window Start: 2026-06-12T15:12:08.254Z
- Window End: 2026-06-12T15:15:03.864Z
- Duration: 2.9 min (175610 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 8
- Total Tokens: 6,792,184
- Cache Hit %: 99.9%
- Total USD: $11.0560
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 8
- cache_create_5m: 0
- cache_create_1h: 7,292
- cache_read: 6,775,907
- output: 8,977

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 8 msgs (100%), $11.0560 (100%)

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

- Edit: 4 calls, 606B results, ~3,751 cache_create tok (6.19×)
- Bash: 1 calls, 180B results, ~1,315 cache_create tok (7.31×)
- Read: 1 calls, 78B results, ~672 cache_create tok (8.62×)
- Write: 1 calls, 134B results, ~672 cache_create tok (5.01×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 8
- usd: $11.0560
- input: 8
- cache_create_5m: 0
- cache_create_1h: 7,292
- cache_read: 6,775,907
- output: 8,977

