---
kind: cost-report
feature: FEAT-189
run_title: "FEAT189 SLICE103"
usd: 11.4783
duration_ms: 229601
total_tokens: 6081900
cache_hit_pct: 99.6
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T10:50:35.101Z
---

# Cost Report: FEAT189 SLICE103

- Created: 2026-06-12T10:50:35.101Z
- Run Title: FEAT189 SLICE103
- Window Start: 2026-06-12T10:46:44.956Z
- Window End: 2026-06-12T10:50:34.557Z
- Duration: 3.8 min (229601 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 15
- Total Tokens: 6,081,900
- Cache Hit %: 99.6%
- Total USD: $11.4783
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 15
- cache_create_5m: 0
- cache_create_1h: 23,273
- cache_read: 6,035,592
- output: 23,020

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 15 msgs (100%), $11.4783 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 5
- Write: 4
- Edit: 2
- Read: 1

## Tool Result Sizes (bytes)

- count: 13
- sum: 2,417
- p50: 133
- p90: 191
- max: 1,133

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 5 calls, 243B results, ~11,326 cache_create tok (46.61×)
- Write: 4 calls, 604B results, ~6,444 cache_create tok (10.67×)
- Edit: 2 calls, 269B results, ~1,222 cache_create tok (4.54×)
- Read: 1 calls, 1,133B results, ~611 cache_create tok (0.54×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 15
- usd: $11.4783
- input: 15
- cache_create_5m: 0
- cache_create_1h: 23,273
- cache_read: 6,035,592
- output: 23,020

