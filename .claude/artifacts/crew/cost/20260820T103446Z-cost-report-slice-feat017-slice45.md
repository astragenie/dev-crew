---
kind: cost-report
feature: FEAT-017
run_title: "FEAT017 SLICE45"
usd: 2.9541
duration_ms: 945908
total_tokens: 9222790
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-20T10:34:46.150Z
---

# Cost Report: FEAT017 SLICE45

- Created: 2026-08-20T10:34:46.150Z
- Run Title: FEAT017 SLICE45
- Window Start: 2026-08-20T10:18:56.797Z
- Window End: 2026-08-20T10:34:42.705Z
- Duration: 15.8 min (945908 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 15
- Total Tokens: 9,222,790
- Cache Hit %: 99.8%
- Total USD: $2.9541
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 30
- cache_create_5m: 0
- cache_create_1h: 14,768
- cache_read: 9,200,987
- output: 7,005

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 15 msgs (100%), $2.9541 (100%)

## Conversation Shape

- user_msg_count: 7
- user_msg_avg_len: 2017
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- SendMessage: 3
- Agent: 1
- Bash: 1

## Tool Result Sizes (bytes)

- count: 5
- sum: 1,724
- p50: 367
- p90: 378
- max: 378

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 3 calls, 1,120B results, ~9,207 cache_create tok (8.22×)
- Agent: 1 calls, 313B results, ~4,777 cache_create tok (15.26×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 15
- usd: $2.9541
- input: 30
- cache_create_5m: 0
- cache_create_1h: 14,768
- cache_read: 9,200,987
- output: 7,005

