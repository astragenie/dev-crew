---
kind: cost-report
feature: FEAT-002
run_title: "FEAT002 SLICE10"
usd: 0.728
duration_ms: 77651
total_tokens: 2077560
cache_hit_pct: 99.5
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T01:19:24.459Z
---

# Cost Report: FEAT002 SLICE10

- Created: 2026-08-19T01:19:24.459Z
- Run Title: FEAT002 SLICE10
- Window Start: 2026-08-19T01:18:03.480Z
- Window End: 2026-08-19T01:19:21.131Z
- Duration: 1.3 min (77651 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 4
- Total Tokens: 2,077,560
- Cache Hit %: 99.5%
- Total USD: $0.7280
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 8
- cache_create_5m: 0
- cache_create_1h: 10,773
- cache_read: 2,063,831
- output: 2,948

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 4 msgs (100%), $0.7280 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 2

## Tool Result Sizes (bytes)

- count: 2
- sum: 395
- p50: 234
- p90: 234
- max: 234

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1 calls, 234B results, ~9,264 cache_create tok (39.59×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 4
- usd: $0.7280
- input: 8
- cache_create_5m: 0
- cache_create_1h: 10,773
- cache_read: 2,063,831
- output: 2,948

