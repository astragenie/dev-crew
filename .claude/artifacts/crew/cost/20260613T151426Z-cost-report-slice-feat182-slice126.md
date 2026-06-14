---
kind: cost-report
feature: FEAT-182
run_title: "FEAT182 SLICE126"
usd: 10.3805
duration_ms: 1471286
total_tokens: 19501610
cache_hit_pct: 98
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T15:14:26.271Z
---

# Cost Report: FEAT182 SLICE126

- Created: 2026-06-13T15:14:26.271Z
- Run Title: FEAT182 SLICE126
- Window Start: 2026-06-13T14:49:54.454Z
- Window End: 2026-06-13T15:14:25.740Z
- Duration: 24.5 min (1471286 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 173
- Total Tokens: 19,501,610
- Cache Hit %: 98%
- Total USD: $10.3805
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 721
- cache_create_5m: 0
- cache_create_1h: 385,257
- cache_read: 18,956,988
- output: 158,644

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 173 msgs (100%), $10.3805 (100%)

## Conversation Shape

- user_msg_count: 11
- user_msg_avg_len: 5245
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 23

## Tool Usage

- Bash: 30
- Agent: 23
- Read: 21
- Edit: 12
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 88
- sum: 83,373
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

- Agent: 23 calls, 20,102B results, ~221,148 cache_create tok (11×)
- Read: 21 calls, 43,643B results, ~78,404 cache_create tok (1.8×)
- Bash: 30 calls, 15,394B results, ~49,349 cache_create tok (3.21×)
- Edit: 12 calls, 1,978B results, ~25,879 cache_create tok (13.08×)
- ToolSearch: 1 calls, 52B results, ~7,779 cache_create tok (149.6×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 173
- usd: $10.3805
- input: 721
- cache_create_5m: 0
- cache_create_1h: 385,257
- cache_read: 18,956,988
- output: 158,644

