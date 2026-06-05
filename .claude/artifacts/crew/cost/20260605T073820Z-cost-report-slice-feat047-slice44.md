---
kind: cost-report
feature: FEAT-047
run_title: "FEAT047 SLICE44"
usd: 6.6805
duration_ms: 1509974
total_tokens: 12589987
cache_hit_pct: 96.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T07:38:20.929Z
---

# Cost Report: FEAT047 SLICE44

- Created: 2026-06-05T07:38:20.929Z
- Run Title: FEAT047 SLICE44
- Window Start: 2026-06-05T07:13:10.799Z
- Window End: 2026-06-05T07:38:20.773Z
- Duration: 25.2 min (1509974 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 115
- Total Tokens: 12,589,987
- Cache Hit %: 96.7%
- Total USD: $6.6805
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 125
- cache_create_5m: 0
- cache_create_1h: 409,589
- cache_read: 12,141,597
- output: 38,676

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 115 msgs (100%), $6.6805 (100%)

## Conversation Shape

- user_msg_count: 8
- user_msg_avg_len: 2067
- turns_before_first_tool: 1
- compaction_count: 4
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 37 (2 failed)
- Edit: 16 (1 failed)
- Read: 15 (1 failed)
- Write: 2

## Tool Result Sizes (bytes)

- count: 71
- sum: 42,168
- p50: 187
- p90: 1,743
- max: 2,824

## File Re-reads

- redundant_read_count: 11
- top paths:
  - 8× C:\work\mega\loop\src\scripts\lib\slice-linker\start-slice.mts
  - 5× C:\work\mega\loop\src\scripts\lib\plugin-identity.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 37 calls, 18,978B results, ~345,838 cache_create tok (18.22×)
- Edit: 16 calls, 2,619B results, ~39,292 cache_create tok (15×)
- Read: 15 calls, 19,982B results, ~14,888 cache_create tok (0.75×)
- Write: 2 calls, 399B results, ~895 cache_create tok (2.24×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 115
- usd: $6.6805
- input: 125
- cache_create_5m: 0
- cache_create_1h: 409,589
- cache_read: 12,141,597
- output: 38,676

