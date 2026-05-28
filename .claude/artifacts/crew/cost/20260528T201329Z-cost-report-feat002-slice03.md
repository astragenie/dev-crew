---
kind: cost-report
feature: FEAT-002
run_title: "FEAT002 SLICE03"
usd: 0.0759
duration_ms: 15097
total_tokens: 227048
cache_hit_pct: 99.8
source_project: C--work-mega-hero-crew-autonomous-loop
source_count: 1
created_at: 2026-05-28T20:13:29.784Z
---

# Cost Report: FEAT002 SLICE03

- Created: 2026-05-28T20:13:29.784Z
- Run Title: FEAT002 SLICE03
- Window Start: 2026-05-28T20:13:14.551Z
- Window End: 2026-05-28T20:13:29.648Z
- Duration: 0.3 min (15097 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 2
- Total Tokens: 227,048
- Cache Hit %: 99.8%
- Total USD: $0.0759
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 2
- cache_create_5m: 0
- cache_create_1h: 447
- cache_read: 226,243
- output: 356

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 2 msgs (100%), $0.0759 (100%)

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
- sum: 108
- p50: 90
- p90: 90
- max: 90

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1 calls, 18B results, ~214 cache_create tok (11.89×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 2
- usd: $0.0759
- input: 2
- cache_create_5m: 0
- cache_create_1h: 447
- cache_read: 226,243
- output: 356

