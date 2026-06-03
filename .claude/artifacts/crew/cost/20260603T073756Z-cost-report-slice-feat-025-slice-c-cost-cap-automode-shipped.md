---
kind: cost-report
run_title: "FEAT-025 SLICE-C — cost cap + autoMode — SHIPPED"
usd: 6.0016
duration_ms: 1417584
total_tokens: 14328261
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-03T07:37:56.802Z
---

# Cost Report: FEAT-025 SLICE-C — cost cap + autoMode — SHIPPED

- Created: 2026-06-03T07:37:56.802Z
- Run Title: FEAT-025 SLICE-C — cost cap + autoMode — SHIPPED
- Window Start: 2026-06-03T07:14:19.049Z
- Window End: 2026-06-03T07:37:56.633Z
- Duration: 23.6 min (1417584 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 48
- Total Tokens: 14,328,261
- Cache Hit %: 99.7%
- Total USD: $6.0016
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 348
- cache_create_5m: 12,985
- cache_create_1h: 30,321
- cache_read: 14,259,729
- output: 24,878

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 42 msgs (87.5%), $4.6030 (76.7%)
- claude-opus-4-7 (priced as claude-opus-4): 6 msgs (12.5%), $1.3986 (23.3%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 13
- Agent: 2
- Grep: 1
- StructuredOutput: 1
- Write: 1
- Edit: 1

## Tool Result Sizes (bytes)

- count: 19
- sum: 9,343
- p50: 243
- p90: 1,422
- max: 1,756

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 12 calls, 6,838B results, ~16,741 cache_create tok (2.45×)
- Agent: 2 calls, 1,794B results, ~9,552 cache_create tok (5.32×)
- Grep: 1 calls, 102B results, ~6,657 cache_create tok (65.26×)
- StructuredOutput: 1 calls, 39B results, ~3,354 cache_create tok (86×)
- Write: 1 calls, 210B results, ~1,654 cache_create tok (7.88×)
- Edit: 1 calls, 178B results, ~664 cache_create tok (3.73×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 6
- usd: $1.3986
- input: 6
- cache_create_5m: 12,985
- cache_create_1h: 0
- cache_read: 298,771
- output: 9,425

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 42
- usd: $4.6030
- input: 342
- cache_create_5m: 0
- cache_create_1h: 30,321
- cache_read: 13,960,958
- output: 15,453

