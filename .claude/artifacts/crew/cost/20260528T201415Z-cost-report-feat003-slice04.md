---
kind: cost-report
feature: FEAT-003
run_title: "FEAT003 SLICE04"
usd: 0.078
duration_ms: 15206
total_tokens: 232072
cache_hit_pct: 99.8
source_project: C--work-mega-hero-crew-autonomous-loop
source_count: 1
created_at: 2026-05-28T20:14:15.017Z
---

# Cost Report: FEAT003 SLICE04

- Created: 2026-05-28T20:14:15.017Z
- Run Title: FEAT003 SLICE04
- Window Start: 2026-05-28T20:13:59.673Z
- Window End: 2026-05-28T20:14:14.879Z
- Duration: 0.3 min (15206 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 2
- Total Tokens: 232,072
- Cache Hit %: 99.8%
- Total USD: $0.0780
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 2
- cache_create_5m: 0
- cache_create_1h: 522
- cache_read: 231,180
- output: 368

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 2 msgs (100%), $0.0780 (99.98%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 2

## Tool Result Sizes (bytes)

- count: 2
- sum: 26
- p50: 18
- p90: 18
- max: 18

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1 calls, 18B results, ~226 cache_create tok (12.56×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 2
- usd: $0.0780
- input: 2
- cache_create_5m: 0
- cache_create_1h: 522
- cache_read: 231,180
- output: 368

