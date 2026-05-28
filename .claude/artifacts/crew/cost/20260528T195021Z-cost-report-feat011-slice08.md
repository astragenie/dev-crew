---
kind: cost-report
feature: FEAT-011
run_title: "FEAT011 SLICE08"
usd: 1.886
duration_ms: 584104
total_tokens: 3840909
cache_hit_pct: 98.1
source_project: C--work-mega-hero-crew-autonomous-loop
source_count: 1
created_at: 2026-05-28T19:50:21.636Z
---

# Cost Report: FEAT011 SLICE08

- Created: 2026-05-28T19:50:21.636Z
- Run Title: FEAT011 SLICE08
- Window Start: 2026-05-28T19:40:37.393Z
- Window End: 2026-05-28T19:50:21.497Z
- Duration: 9.7 min (584104 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 51
- Total Tokens: 3,840,909
- Cache Hit %: 98.1%
- Total USD: $1.8860
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 59
- cache_create_5m: 0
- cache_create_1h: 72,834
- cache_read: 3,746,353
- output: 21,663

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 51 msgs (100%), $1.8860 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 22
- Read: 4
- Edit: 2
- Agent: 1

## Tool Result Sizes (bytes)

- count: 30
- sum: 33,686
- p50: 562
- p90: 4,287
- max: 7,648

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\hero-crew-autonomous-loop\src\scripts\lib\slice-linker\start-slice.mts
  - 2× C:\work\mega\hero-crew-autonomous-loop\src\scripts\loop.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 22 calls, 11,638B results, ~31,325 cache_create tok (2.69×)
- Read: 4 calls, 15,710B results, ~19,940 cache_create tok (1.27×)
- Agent: 1 calls, 235B results, ~12,573 cache_create tok (53.5×)
- Edit: 2 calls, 378B results, ~6,970 cache_create tok (18.44×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 51
- usd: $1.8860
- input: 59
- cache_create_5m: 0
- cache_create_1h: 72,834
- cache_read: 3,746,353
- output: 21,663

