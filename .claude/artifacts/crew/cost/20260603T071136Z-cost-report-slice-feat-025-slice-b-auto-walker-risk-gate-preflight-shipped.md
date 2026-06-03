---
kind: cost-report
run_title: "FEAT-025 SLICE-B — auto-walker risk gate + preflight — SHIPPED"
usd: 3.9014
duration_ms: 1492317
total_tokens: 11709484
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-03T07:11:36.861Z
---

# Cost Report: FEAT-025 SLICE-B — auto-walker risk gate + preflight — SHIPPED

- Created: 2026-06-03T07:11:36.861Z
- Run Title: FEAT-025 SLICE-B — auto-walker risk gate + preflight — SHIPPED
- Window Start: 2026-06-03T06:46:44.406Z
- Window End: 2026-06-03T07:11:36.723Z
- Duration: 24.9 min (1492317 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 37
- Total Tokens: 11,709,484
- Cache Hit %: 99.7%
- Total USD: $3.9014
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 302
- cache_create_5m: 0
- cache_create_1h: 32,081
- cache_read: 11,663,164
- output: 13,937

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 37 msgs (100%), $3.9014 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 9
- Agent: 2
- Read: 2
- Edit: 2 (1 failed)
- Write: 1

## Tool Result Sizes (bytes)

- count: 16
- sum: 9,460
- p50: 243
- p90: 2,250
- max: 2,878

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 3,136B results, ~11,988 cache_create tok (3.82×)
- Bash: 8 calls, 4,952B results, ~9,299 cache_create tok (1.88×)
- Write: 1 calls, 213B results, ~1,802 cache_create tok (8.46×)
- Edit: 2 calls, 274B results, ~1,726 cache_create tok (6.3×)
- Read: 2 calls, 703B results, ~1,132 cache_create tok (1.61×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 37
- usd: $3.9014
- input: 302
- cache_create_5m: 0
- cache_create_1h: 32,081
- cache_read: 11,663,164
- output: 13,937

