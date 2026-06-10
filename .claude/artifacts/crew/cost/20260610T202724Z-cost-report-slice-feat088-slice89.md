---
kind: cost-report
feature: FEAT-088
run_title: "FEAT088 SLICE89"
usd: 10.3372
duration_ms: 462838
total_tokens: 5162485
cache_hit_pct: 99.1
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-10T20:27:24.456Z
---

# Cost Report: FEAT088 SLICE89

- Created: 2026-06-10T20:27:24.456Z
- Run Title: FEAT088 SLICE89
- Window Start: 2026-06-10T20:19:41.173Z
- Window End: 2026-06-10T20:27:24.011Z
- Duration: 7.7 min (462838 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 44
- Total Tokens: 5,162,485
- Cache Hit %: 99.1%
- Total USD: $10.3372
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 2,369
- cache_create_5m: 0
- cache_create_1h: 42,379
- cache_read: 5,099,320
- output: 18,417

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 44 msgs (100%), $10.3372 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 12
- Read: 3
- Edit: 1
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 17
- sum: 13,997
- p50: 266
- p90: 1,125
- max: 8,133

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\Users\milas\AppData\Local\Temp\claude\C--work-mega-loop\d32fdd15-735c-4c02-8fcc-7e4f2b9d63cd\tasks\b7dokxyzo.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 11 calls, 5,161B results, ~16,825 cache_create tok (3.26×)
- ToolSearch: 1 calls, 49B results, ~8,157 cache_create tok (166.47×)
- Read: 3 calls, 485B results, ~4,557 cache_create tok (9.4×)
- Edit: 1 calls, 169B results, ~1,512 cache_create tok (8.95×)


## By Model (token detail)

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 44
- usd: $10.3372
- input: 2,369
- cache_create_5m: 0
- cache_create_1h: 42,379
- cache_read: 5,099,320
- output: 18,417

