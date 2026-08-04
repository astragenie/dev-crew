---
kind: cost-report
feature: FEAT-230
run_title: "FEAT230 SLICE195"
usd: 3.7474
duration_ms: 595706
total_tokens: 10846618
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-04T20:54:55.365Z
---

# Cost Report: FEAT230 SLICE195

- Created: 2026-08-04T20:54:55.365Z
- Run Title: FEAT230 SLICE195
- Window Start: 2026-08-04T20:44:59.035Z
- Window End: 2026-08-04T20:54:54.741Z
- Duration: 9.9 min (595706 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 22
- Total Tokens: 10,846,618
- Cache Hit %: 99.8%
- Total USD: $3.7474
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 44
- cache_create_5m: 0
- cache_create_1h: 25,856
- cache_read: 10,797,188
- output: 23,530

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 22 msgs (100%), $3.7474 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 2318
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 6
- Agent: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 10
- sum: 3,426
- p50: 305
- p90: 979
- max: 979

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 612B results, ~14,710 cache_create tok (24.04×)
- Bash: 6 calls, 2,263B results, ~6,967 cache_create tok (3.08×)
- Write: 1 calls, 138B results, ~2,142 cache_create tok (15.52×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 22
- usd: $3.7474
- input: 44
- cache_create_5m: 0
- cache_create_1h: 25,856
- cache_read: 10,797,188
- output: 23,530

