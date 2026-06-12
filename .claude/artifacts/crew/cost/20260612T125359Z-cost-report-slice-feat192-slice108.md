---
kind: cost-report
feature: FEAT-192
run_title: "FEAT192 SLICE108"
usd: 18.0184
duration_ms: 281717
total_tokens: 10910192
cache_hit_pct: 99.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T12:53:59.287Z
---

# Cost Report: FEAT192 SLICE108

- Created: 2026-06-12T12:53:59.287Z
- Run Title: FEAT192 SLICE108
- Window Start: 2026-06-12T12:49:17.138Z
- Window End: 2026-06-12T12:53:58.855Z
- Duration: 4.7 min (281717 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 17
- Total Tokens: 10,910,192
- Cache Hit %: 99.8%
- Total USD: $18.0184
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 17
- cache_create_5m: 0
- cache_create_1h: 20,860
- cache_read: 10,874,916
- output: 14,399

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 17 msgs (100%), $18.0184 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Edit: 7 (1 failed)
- Bash: 6
- Read: 2

## Tool Result Sizes (bytes)

- count: 16
- sum: 6,873
- p50: 168
- p90: 732
- max: 3,846

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Edit: 7 calls, 1,048B results, ~9,806 cache_create tok (9.36×)
- Bash: 6 calls, 1,584B results, ~5,282 cache_create tok (3.33×)
- Read: 2 calls, 4,034B results, ~2,043 cache_create tok (0.51×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 17
- usd: $18.0184
- input: 17
- cache_create_5m: 0
- cache_create_1h: 20,860
- cache_read: 10,874,916
- output: 14,399

