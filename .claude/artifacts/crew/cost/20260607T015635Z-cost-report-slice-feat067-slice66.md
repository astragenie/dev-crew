---
kind: cost-report
feature: FEAT-067
run_title: "FEAT067 SLICE66"
usd: 15.6102
duration_ms: 169467
total_tokens: 9351894
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T01:56:35.038Z
---

# Cost Report: FEAT067 SLICE66

- Created: 2026-06-07T01:56:35.038Z
- Run Title: FEAT067 SLICE66
- Window Start: 2026-06-07T01:53:36.973Z
- Window End: 2026-06-07T01:56:26.440Z
- Duration: 2.8 min (169467 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 23
- Total Tokens: 9,351,894
- Cache Hit %: 99.7%
- Total USD: $15.6102
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 23
- cache_create_5m: 0
- cache_create_1h: 27,962
- cache_read: 9,313,227
- output: 10,682

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 23 msgs (100%), $15.6102 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 9
- Read: 2
- Edit: 2

## Tool Result Sizes (bytes)

- count: 13
- sum: 18,983
- p50: 242
- p90: 4,494
- max: 8,787

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\auto-merge.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 2 calls, 13,281B results, ~13,316 cache_create tok (1×)
- Bash: 8 calls, 4,910B results, ~11,658 cache_create tok (2.37×)
- Edit: 2 calls, 370B results, ~2,182 cache_create tok (5.9×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 23
- usd: $15.6102
- input: 23
- cache_create_5m: 0
- cache_create_1h: 27,962
- cache_read: 9,313,227
- output: 10,682

