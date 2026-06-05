---
kind: cost-report
feature: FEAT-043
run_title: "FEAT043 SLICE45"
usd: 2.6159
duration_ms: 862086
total_tokens: 6270406
cache_hit_pct: 99.1
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T09:34:18.296Z
---

# Cost Report: FEAT043 SLICE45

- Created: 2026-06-05T09:34:18.296Z
- Run Title: FEAT043 SLICE45
- Window Start: 2026-06-05T09:19:56.087Z
- Window End: 2026-06-05T09:34:18.173Z
- Duration: 14.4 min (862086 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 69
- Total Tokens: 6,270,406
- Cache Hit %: 99.1%
- Total USD: $2.6159
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 75
- cache_create_5m: 0
- cache_create_1h: 58,725
- cache_read: 6,184,406
- output: 27,200

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 69 msgs (100%), $2.6159 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 27
- Read: 7
- Edit: 6
- Agent: 1
- Glob: 1

## Tool Result Sizes (bytes)

- count: 43
- sum: 34,058
- p50: 370
- p90: 1,636
- max: 6,802

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 4× C:\work\mega\loop\src\scripts\lib\pm-scorer.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 27 calls, 13,291B results, ~22,176 cache_create tok (1.67×)
- Read: 7 calls, 16,323B results, ~17,049 cache_create tok (1.04×)
- Edit: 6 calls, 904B results, ~10,508 cache_create tok (11.62×)
- Agent: 1 calls, 285B results, ~6,618 cache_create tok (23.22×)
- Glob: 1 calls, 79B results, ~146 cache_create tok (1.85×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 69
- usd: $2.6159
- input: 75
- cache_create_5m: 0
- cache_create_1h: 58,725
- cache_read: 6,184,406
- output: 27,200

