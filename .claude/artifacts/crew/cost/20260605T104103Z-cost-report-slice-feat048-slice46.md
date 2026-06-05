---
kind: cost-report
feature: FEAT-048
run_title: "FEAT048 SLICE46"
usd: 0.1166
duration_ms: 17770
total_tokens: 264740
cache_hit_pct: 98.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T10:41:03.972Z
---

# Cost Report: FEAT048 SLICE46

- Created: 2026-06-05T10:41:03.972Z
- Run Title: FEAT048 SLICE46
- Window Start: 2026-06-05T10:40:46.069Z
- Window End: 2026-06-05T10:41:03.839Z
- Duration: 0.3 min (17770 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 4
- Total Tokens: 264,740
- Cache Hit %: 98.7%
- Total USD: $0.1166
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 4
- cache_create_5m: 0
- cache_create_1h: 3,417
- cache_read: 260,114
- output: 1,205

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 4 msgs (100%), $0.1166 (99.98%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 2

## Tool Result Sizes (bytes)

- count: 3
- sum: 3,456
- p50: 463
- p90: 2,962
- max: 2,962

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 2 calls, 494B results, ~327 cache_create tok (0.66×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 4
- usd: $0.1166
- input: 4
- cache_create_5m: 0
- cache_create_1h: 3,417
- cache_read: 260,114
- output: 1,205

