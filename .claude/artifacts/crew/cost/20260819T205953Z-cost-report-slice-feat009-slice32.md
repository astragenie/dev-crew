---
kind: cost-report
feature: FEAT-009
run_title: "FEAT009 SLICE32"
usd: 7.523
duration_ms: 1462636
total_tokens: 22366605
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T20:59:53.993Z
---

# Cost Report: FEAT009 SLICE32

- Created: 2026-08-19T20:59:53.993Z
- Run Title: FEAT009 SLICE32
- Window Start: 2026-08-19T20:35:28.489Z
- Window End: 2026-08-19T20:59:51.125Z
- Duration: 24.4 min (1462636 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 53
- Total Tokens: 22,366,605
- Cache Hit %: 99.7%
- Total USD: $7.5230
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 106
- cache_create_5m: 0
- cache_create_1h: 68,210
- cache_read: 22,269,448
- output: 28,841

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 53 msgs (100%), $7.5230 (100%)

## Conversation Shape

- user_msg_count: 10
- user_msg_avg_len: 3847
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 14 (2 failed)
- SendMessage: 4
- Write: 4
- Agent: 2
- TaskUpdate: 2
- Edit: 1

## Tool Result Sizes (bytes)

- count: 27
- sum: 7,718
- p50: 230
- p90: 409
- max: 1,275

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 4 calls, 1,535B results, ~31,855 cache_create tok (20.75×)
- Bash: 13 calls, 4,327B results, ~25,172 cache_create tok (5.82×)
- Write: 4 calls, 920B results, ~4,908 cache_create tok (5.33×)
- Agent: 2 calls, 626B results, ~3,630 cache_create tok (5.8×)
- TaskUpdate: 2 calls, 57B results, ~1,289 cache_create tok (22.61×)
- Edit: 1 calls, 170B results, ~417 cache_create tok (2.45×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 53
- usd: $7.5230
- input: 106
- cache_create_5m: 0
- cache_create_1h: 68,210
- cache_read: 22,269,448
- output: 28,841

