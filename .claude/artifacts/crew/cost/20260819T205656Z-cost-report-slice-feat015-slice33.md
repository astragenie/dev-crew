---
kind: cost-report
feature: FEAT-015
run_title: "FEAT015 SLICE33"
usd: 5.9413
duration_ms: 1285132
total_tokens: 17539852
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T20:56:56.525Z
---

# Cost Report: FEAT015 SLICE33

- Created: 2026-08-19T20:56:56.525Z
- Run Title: FEAT015 SLICE33
- Window Start: 2026-08-19T20:35:28.489Z
- Window End: 2026-08-19T20:56:53.621Z
- Duration: 21.4 min (1285132 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 42
- Total Tokens: 17,539,852
- Cache Hit %: 99.7%
- Total USD: $5.9413
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 84
- cache_create_5m: 0
- cache_create_1h: 58,212
- cache_read: 17,457,929
- output: 23,627

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 42 msgs (100%), $5.9413 (100%)

## Conversation Shape

- user_msg_count: 8
- user_msg_avg_len: 4204
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 9
- SendMessage: 4
- Write: 3
- Agent: 2
- TaskUpdate: 2
- Edit: 1

## Tool Result Sizes (bytes)

- count: 22
- sum: 5,905
- p50: 230
- p90: 401
- max: 1,214

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 4 calls, 1,535B results, ~31,855 cache_create tok (20.75×)
- Bash: 9 calls, 2,744B results, ~18,331 cache_create tok (6.68×)
- Agent: 2 calls, 626B results, ~3,630 cache_create tok (5.8×)
- Write: 3 calls, 690B results, ~1,751 cache_create tok (2.54×)
- TaskUpdate: 2 calls, 57B results, ~1,289 cache_create tok (22.61×)
- Edit: 1 calls, 170B results, ~417 cache_create tok (2.45×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 42
- usd: $5.9413
- input: 84
- cache_create_5m: 0
- cache_create_1h: 58,212
- cache_read: 17,457,929
- output: 23,627

