---
kind: cost-report
feature: FEAT-025
run_title: "FEAT025 SLICE50"
usd: 7.3255
duration_ms: 1731442
total_tokens: 27765941
cache_hit_pct: 99.7
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
run_id: "2026-11-06T04:12:02.256Z_2026-11-06T04:40:53.698Z"
created_at: 2026-11-06T04:40:53.877Z
---

# Cost Report: FEAT025 SLICE50

- Created: 2026-11-06T04:40:53.877Z
- Run Title: FEAT025 SLICE50
- Window Start: 2026-11-06T04:12:02.256Z
- Window End: 2026-11-06T04:40:53.698Z
- Duration: 28.9 min (1731442 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 45
- Total Tokens: 27,765,941
- Cache Hit %: 99.7%
- Total USD: $7.3255
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 90
- cache_create_5m: 0
- cache_create_1h: 88,503
- cache_read: 27,622,719
- output: 54,629

## Model Mix

- claude-opus-5 (priced as claude-opus-5): 45 msgs (100%), $7.3255 (100%)

## Conversation Shape

- user_msg_count: 11
- user_msg_avg_len: 3283
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 5

## Tool Usage

- Bash: 7
- Agent: 5
- Write: 3
- SendMessage: 2

## Tool Result Sizes (bytes)

- count: 17
- sum: 7,290
- p50: 293
- p90: 1,541
- max: 1,596

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 6 calls, 4,327B results, ~37,796 cache_create tok (8.73×)
- Agent: 5 calls, 1,469B results, ~34,372 cache_create tok (23.4×)
- Write: 3 calls, 659B results, ~10,956 cache_create tok (16.63×)
- SendMessage: 2 calls, 709B results, ~4,623 cache_create tok (6.52×)


## By Model (token detail)

### claude-opus-5 (priced as claude-opus-5)
- messages: 45
- usd: $7.3255
- input: 90
- cache_create_5m: 0
- cache_create_1h: 88,503
- cache_read: 27,622,719
- output: 54,629

