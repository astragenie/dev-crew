---
kind: cost-report
feature: FEAT-284
run_title: "FEAT284 SLICE190"
usd: 6.6629
duration_ms: 1081777
total_tokens: 17723581
cache_hit_pct: 99.5
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T19:47:35.462Z
---

# Cost Report: FEAT284 SLICE190

- Created: 2026-08-04T19:47:35.462Z
- Run Title: FEAT284 SLICE190
- Window Start: 2026-08-04T19:29:29.702Z
- Window End: 2026-08-04T19:47:31.479Z
- Duration: 18.0 min (1081777 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 47
- Total Tokens: 17,723,581
- Cache Hit %: 99.5%
- Total USD: $6.6629
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 94
- cache_create_5m: 0
- cache_create_1h: 92,363
- cache_read: 17,575,403
- output: 55,721

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 47 msgs (100%), $6.6629 (100%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 3033
- turns_before_first_tool: 0
- compaction_count: 1
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Bash: 15
- Agent: 3
- Write: 2

## Tool Result Sizes (bytes)

- count: 20
- sum: 5,800
- p50: 227
- p90: 809
- max: 1,289

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 14 calls, 4,189B results, ~51,508 cache_create tok (12.3×)
- Write: 2 calls, 453B results, ~22,139 cache_create tok (48.87×)
- Agent: 3 calls, 927B results, ~18,021 cache_create tok (19.44×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 47
- usd: $6.6629
- input: 94
- cache_create_5m: 0
- cache_create_1h: 92,363
- cache_read: 17,575,403
- output: 55,721

