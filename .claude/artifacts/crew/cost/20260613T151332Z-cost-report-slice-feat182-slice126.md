---
kind: cost-report
feature: FEAT-182
run_title: "FEAT182 SLICE126"
usd: 9.8894
duration_ms: 1417618
total_tokens: 18375888
cache_hit_pct: 97.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T15:13:32.582Z
---

# Cost Report: FEAT182 SLICE126

- Created: 2026-06-13T15:13:32.582Z
- Run Title: FEAT182 SLICE126
- Window Start: 2026-06-13T14:49:54.454Z
- Window End: 2026-06-13T15:13:32.072Z
- Duration: 23.6 min (1417618 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 166
- Total Tokens: 18,375,888
- Cache Hit %: 97.9%
- Total USD: $9.8894
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 708
- cache_create_5m: 0
- cache_create_1h: 378,864
- cache_read: 17,845,625
- output: 150,691

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 166 msgs (100%), $9.8894 (100%)

## Conversation Shape

- user_msg_count: 10
- user_msg_avg_len: 5530
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 21

## Tool Usage

- Bash: 29
- Agent: 21
- Read: 21
- Edit: 12
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 85
- sum: 81,450
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

- Agent: 21 calls, 18,354B results, ~217,482 cache_create tok (11.85×)
- Read: 21 calls, 43,643B results, ~78,404 cache_create tok (1.8×)
- Bash: 29 calls, 15,219B results, ~46,622 cache_create tok (3.06×)
- Edit: 12 calls, 1,978B results, ~25,879 cache_create tok (13.08×)
- ToolSearch: 1 calls, 52B results, ~7,779 cache_create tok (149.6×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 166
- usd: $9.8894
- input: 708
- cache_create_5m: 0
- cache_create_1h: 378,864
- cache_read: 17,845,625
- output: 150,691

