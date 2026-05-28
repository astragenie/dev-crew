---
kind: cost-report
feature: FEAT-004
run_title: "FEAT004 SLICE01"
usd: 0.0401
duration_ms: 14652
total_tokens: 120933
cache_hit_pct: 99.9
source_project: C--work-mega-hero-crew-autonomous-loop
source_count: 1
created_at: 2026-05-28T20:16:01.395Z
---

# Cost Report: FEAT004 SLICE01

- Created: 2026-05-28T20:16:01.395Z
- Run Title: FEAT004 SLICE01
- Window Start: 2026-05-28T20:15:46.611Z
- Window End: 2026-05-28T20:16:01.263Z
- Duration: 0.2 min (14652 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 1
- Total Tokens: 120,933
- Cache Hit %: 99.9%
- Total USD: $0.0401
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 1
- cache_create_5m: 0
- cache_create_1h: 160
- cache_read: 120,572
- output: 200

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 1 msgs (100%), $0.0401 (99.91%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 1

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

- Bash: 1 calls, 18B results, ~0 cache_create tok (0×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 1
- usd: $0.0401
- input: 1
- cache_create_5m: 0
- cache_create_1h: 160
- cache_read: 120,572
- output: 200

