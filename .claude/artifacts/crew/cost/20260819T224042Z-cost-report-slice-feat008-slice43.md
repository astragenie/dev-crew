---
kind: cost-report
feature: FEAT-008
run_title: "FEAT008 SLICE43"
usd: 4.7457
duration_ms: 1338419
total_tokens: 14549816
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T22:40:42.540Z
---

# Cost Report: FEAT008 SLICE43

- Created: 2026-08-19T22:40:42.540Z
- Run Title: FEAT008 SLICE43
- Window Start: 2026-08-19T22:18:21.184Z
- Window End: 2026-08-19T22:40:39.603Z
- Duration: 22.3 min (1338419 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 25
- Total Tokens: 14,549,816
- Cache Hit %: 99.8%
- Total USD: $4.7457
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 50
- cache_create_5m: 0
- cache_create_1h: 34,962
- cache_read: 14,502,465
- output: 12,339

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 25 msgs (100%), $4.7457 (100%)

## Conversation Shape

- user_msg_count: 10
- user_msg_avg_len: 2325
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 3
- SendMessage: 3
- Agent: 2
- Write: 2
- Read: 1

## Tool Result Sizes (bytes)

- count: 11
- sum: 2,907
- p50: 313
- p90: 380
- max: 388

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 3 calls, 1,144B results, ~13,626 cache_create tok (11.91×)
- Bash: 2 calls, 475B results, ~10,441 cache_create tok (21.98×)
- Agent: 2 calls, 626B results, ~5,819 cache_create tok (9.3×)
- Write: 2 calls, 460B results, ~4,002 cache_create tok (8.7×)
- Read: 1 calls, 119B results, ~485 cache_create tok (4.08×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 25
- usd: $4.7457
- input: 50
- cache_create_5m: 0
- cache_create_1h: 34,962
- cache_read: 14,502,465
- output: 12,339

