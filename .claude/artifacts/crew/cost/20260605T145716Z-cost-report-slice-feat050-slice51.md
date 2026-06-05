---
kind: cost-report
feature: FEAT-050
run_title: "FEAT050 SLICE51"
usd: 34.8197
duration_ms: 1349606
total_tokens: 18921723
cache_hit_pct: 99.5
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T14:57:16.115Z
---

# Cost Report: FEAT050 SLICE51

- Created: 2026-06-05T14:57:16.116Z
- Run Title: FEAT050 SLICE51
- Window Start: 2026-06-05T14:34:30.103Z
- Window End: 2026-06-05T14:56:59.709Z
- Duration: 22.5 min (1349606 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 47
- Total Tokens: 18,921,723
- Cache Hit %: 99.5%
- Total USD: $34.8197
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 102
- cache_create_5m: 0
- cache_create_1h: 84,973
- cache_read: 18,782,035
- output: 54,613

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 47 msgs (100%), $34.8197 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 6

## Tool Usage

- Bash: 10 (1 failed)
- Agent: 6
- Edit: 6 (2 failed)
- Read: 2
- Grep: 1

## Tool Result Sizes (bytes)

- count: 25
- sum: 14,382
- p50: 321
- p90: 1,480
- max: 2,340

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 6 calls, 7,580B results, ~44,929 cache_create tok (5.93×)
- Bash: 9 calls, 2,142B results, ~16,788 cache_create tok (7.84×)
- Edit: 6 calls, 852B results, ~7,650 cache_create tok (8.98×)
- Read: 2 calls, 1,335B results, ~1,758 cache_create tok (1.32×)
- Grep: 1 calls, 214B results, ~255 cache_create tok (1.19×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 47
- usd: $34.8197
- input: 102
- cache_create_5m: 0
- cache_create_1h: 84,973
- cache_read: 18,782,035
- output: 54,613

