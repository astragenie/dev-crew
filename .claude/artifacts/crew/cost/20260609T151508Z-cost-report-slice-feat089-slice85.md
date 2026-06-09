---
kind: cost-report
feature: FEAT-089
run_title: "FEAT089 SLICE85"
usd: 3.1327
duration_ms: 556142
total_tokens: 4634784
cache_hit_pct: 94.2
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-09T15:15:08.164Z
---

# Cost Report: FEAT089 SLICE85

- Created: 2026-06-09T15:15:08.164Z
- Run Title: FEAT089 SLICE85
- Window Start: 2026-06-09T15:05:51.804Z
- Window End: 2026-06-09T15:15:07.946Z
- Duration: 9.3 min (556142 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 47
- Total Tokens: 4,634,784
- Cache Hit %: 94.2%
- Total USD: $3.1327
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 382
- cache_create_5m: 0
- cache_create_1h: 268,420
- cache_read: 4,351,614
- output: 14,368

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 47 msgs (100%), $3.1327 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 379
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 7
- Read: 5
- Edit: 4 (1 failed)
- Write: 2
- PowerShell: 1

## Tool Result Sizes (bytes)

- count: 19
- sum: 14,833
- p50: 134
- p90: 4,242
- max: 8,220

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 3× C:\Users\milas\AppData\Local\Temp\claude\C--work-mega-loop\aa5b349f-c0be-4f61-972d-45a310b16340\tasks\b3dkucgun.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 5 calls, 4,917B results, ~244,267 cache_create tok (49.68×)
- Bash: 6 calls, 624B results, ~8,993 cache_create tok (14.41×)
- Edit: 4 calls, 650B results, ~4,290 cache_create tok (6.6×)
- Write: 2 calls, 406B results, ~2,662 cache_create tok (6.56×)
- PowerShell: 1 calls, 16B results, ~414 cache_create tok (25.88×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 47
- usd: $3.1327
- input: 382
- cache_create_5m: 0
- cache_create_1h: 268,420
- cache_read: 4,351,614
- output: 14,368

