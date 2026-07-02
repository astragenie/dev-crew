---
kind: cost-report
feature: FEAT-203
run_title: "FEAT203 SLICE136"
usd: 7.7442
duration_ms: 934486
total_tokens: 3370674
cache_hit_pct: 98.8
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-01T23:31:40.429Z
---

# Cost Report: FEAT203 SLICE136

- Created: 2026-07-01T23:31:40.429Z
- Run Title: FEAT203 SLICE136
- Window Start: 2026-07-01T23:16:05.921Z
- Window End: 2026-07-01T23:31:40.407Z
- Duration: 15.6 min (934486 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 14
- Total Tokens: 3,370,674
- Cache Hit %: 98.8%
- Total USD: $7.7442
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 34
- cache_create_5m: 0
- cache_create_1h: 39,304
- cache_read: 3,310,008
- output: 21,328

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 14 msgs (100%), $7.7442 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 6 (1 failed)
- Agent: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 9
- sum: 6,118
- p50: 91
- p90: 2,863
- max: 2,863

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 6 calls, 419B results, ~17,762 cache_create tok (42.39×)
- Agent: 1 calls, 2,687B results, ~13,755 cache_create tok (5.12×)
- Write: 1 calls, 149B results, ~3,656 cache_create tok (24.54×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 14
- usd: $7.7442
- input: 34
- cache_create_5m: 0
- cache_create_1h: 39,304
- cache_read: 3,310,008
- output: 21,328

