---
kind: cost-report
feature: FEAT-194
run_title: "FEAT194 SLICE110"
usd: 49.9827
duration_ms: 367201
total_tokens: 30184112
cache_hit_pct: 99.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T14:07:39.784Z
---

# Cost Report: FEAT194 SLICE110

- Created: 2026-06-12T14:07:39.784Z
- Run Title: FEAT194 SLICE110
- Window Start: 2026-06-12T14:01:31.922Z
- Window End: 2026-06-12T14:07:39.123Z
- Duration: 6.1 min (367201 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 41
- Total Tokens: 30,184,112
- Cache Hit %: 99.8%
- Total USD: $49.9827
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 41
- cache_create_5m: 0
- cache_create_1h: 51,196
- cache_read: 30,088,699
- output: 44,176

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 41 msgs (100%), $49.9827 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Edit: 13 (1 failed)
- Bash: 12
- Write: 4 (1 failed)
- Read: 4

## Tool Result Sizes (bytes)

- count: 33
- sum: 6,767
- p50: 144
- p90: 243
- max: 1,690

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 11 calls, 1,384B results, ~22,795 cache_create tok (16.47×)
- Edit: 13 calls, 1,895B results, ~17,571 cache_create tok (9.27×)
- Write: 4 calls, 553B results, ~4,587 cache_create tok (8.29×)
- Read: 4 calls, 2,728B results, ~3,737 cache_create tok (1.37×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 41
- usd: $49.9827
- input: 41
- cache_create_5m: 0
- cache_create_1h: 51,196
- cache_read: 30,088,699
- output: 44,176

