---
kind: cost-report
feature: FEAT-173
run_title: "FEAT173 SLICE127"
usd: 10.5944
duration_ms: 1510620
total_tokens: 19994795
cache_hit_pct: 98
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T15:15:05.593Z
---

# Cost Report: FEAT173 SLICE127

- Created: 2026-06-13T15:15:05.593Z
- Run Title: FEAT173 SLICE127
- Window Start: 2026-06-13T14:49:54.433Z
- Window End: 2026-06-13T15:15:05.053Z
- Duration: 25.2 min (1510620 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 176
- Total Tokens: 19,994,795
- Cache Hit %: 98%
- Total USD: $10.5944
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 730
- cache_create_5m: 0
- cache_create_1h: 387,549
- cache_read: 19,444,272
- output: 162,244

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 176 msgs (100%), $10.5944 (100%)

## Conversation Shape

- user_msg_count: 12
- user_msg_avg_len: 4962
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 24

## Tool Usage

- Bash: 30
- Agent: 24
- Read: 21
- Edit: 12
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 89
- sum: 84,247
- p50: 874
- p90: 2,193
- max: 9,599

## File Re-reads

- redundant_read_count: 13
- top paths:
  - 8× C:\work\mega\.-FEAT-175-0\src\scripts\lib\artifact-linker.mts
  - 4× C:\work\mega\.-FEAT-173-0\src\scripts\dispatch.mts
  - 3× C:\work\mega\.-FEAT-182-0\src\scripts\lib\backlog-auditor.mts
  - 2× C:\work\mega\.-FEAT-175-0\src\scripts\loop.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 24 calls, 20,976B results, ~223,440 cache_create tok (10.65×)
- Read: 21 calls, 43,643B results, ~78,404 cache_create tok (1.8×)
- Bash: 30 calls, 15,394B results, ~49,349 cache_create tok (3.21×)
- Edit: 12 calls, 1,978B results, ~25,879 cache_create tok (13.08×)
- ToolSearch: 1 calls, 52B results, ~7,779 cache_create tok (149.6×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 176
- usd: $10.5944
- input: 730
- cache_create_5m: 0
- cache_create_1h: 387,549
- cache_read: 19,444,272
- output: 162,244

