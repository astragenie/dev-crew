---
kind: cost-report
feature: FEAT-168
run_title: "FEAT168 SLICE100"
usd: 66.2607
duration_ms: 670537
total_tokens: 37122350
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T12:28:02.950Z
---

# Cost Report: FEAT168 SLICE100

- Created: 2026-06-12T12:28:02.950Z
- Run Title: FEAT168 SLICE100
- Window Start: 2026-06-12T12:16:51.983Z
- Window End: 2026-06-12T12:28:02.520Z
- Duration: 11.2 min (670537 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 71
- Total Tokens: 37,122,350
- Cache Hit %: 99.7%
- Total USD: $66.2607
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 71
- cache_create_5m: 0
- cache_create_1h: 105,633
- cache_read: 36,913,712
- output: 102,934

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 71 msgs (100%), $66.2607 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 23
- Read: 13
- Edit: 8
- Write: 4

## Tool Result Sizes (bytes)

- count: 49
- sum: 27,264
- p50: 177
- p90: 1,622
- max: 3,449

## File Re-reads

- redundant_read_count: 6
- top paths:
  - 4× C:\work\mega\loop\src\scripts\lib\slice-linker\feature-lifecycle.mts
  - 3× C:\work\mega\loop\src\scripts\lib\backlog-parser.mts
  - 2× C:\work\mega\loop\src\scripts\lib\auto-dispatch.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 23 calls, 6,372B results, ~57,447 cache_create tok (9.02×)
- Read: 13 calls, 18,848B results, ~24,638 cache_create tok (1.31×)
- Edit: 8 calls, 1,333B results, ~13,730 cache_create tok (10.3×)
- Write: 4 calls, 543B results, ~6,348 cache_create tok (11.69×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 71
- usd: $66.2607
- input: 71
- cache_create_5m: 0
- cache_create_1h: 105,633
- cache_read: 36,913,712
- output: 102,934

