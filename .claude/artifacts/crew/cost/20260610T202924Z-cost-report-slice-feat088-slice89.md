---
kind: cost-report
feature: FEAT-088
run_title: "FEAT088 SLICE89"
usd: 13.0728
duration_ms: 583388
total_tokens: 6202485
cache_hit_pct: 98.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-10T20:29:24.906Z
---

# Cost Report: FEAT088 SLICE89

- Created: 2026-06-10T20:29:24.906Z
- Run Title: FEAT088 SLICE89
- Window Start: 2026-06-10T20:19:41.173Z
- Window End: 2026-06-10T20:29:24.561Z
- Duration: 9.7 min (583388 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 52
- Total Tokens: 6,202,485
- Cache Hit %: 98.9%
- Total USD: $13.0728
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 2,922
- cache_create_5m: 0
- cache_create_1h: 63,596
- cache_read: 6,109,884
- output: 26,083

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 52 msgs (100%), $13.0728 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 14
- Read: 3
- Edit: 1
- ToolSearch: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 20
- sum: 22,463
- p50: 290
- p90: 7,188
- max: 8,133

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\Users\milas\AppData\Local\Temp\claude\C--work-mega-loop\d32fdd15-735c-4c02-8fcc-7e4f2b9d63cd\tasks\b7dokxyzo.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 13 calls, 13,398B results, ~35,050 cache_create tok (2.62×)
- ToolSearch: 1 calls, 49B results, ~8,157 cache_create tok (166.47×)
- Read: 3 calls, 485B results, ~4,557 cache_create tok (9.4×)
- Write: 1 calls, 229B results, ~2,992 cache_create tok (13.07×)
- Edit: 1 calls, 169B results, ~1,512 cache_create tok (8.95×)


## By Model (token detail)

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 52
- usd: $13.0728
- input: 2,922
- cache_create_5m: 0
- cache_create_1h: 63,596
- cache_read: 6,109,884
- output: 26,083

