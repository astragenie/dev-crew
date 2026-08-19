---
kind: cost-report
feature: FEAT-003
run_title: "FEAT003 SLICE13"
usd: 2.8576
duration_ms: 1904998
total_tokens: 8521450
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T03:04:33.641Z
---

# Cost Report: FEAT003 SLICE13

- Created: 2026-08-19T03:04:33.641Z
- Run Title: FEAT003 SLICE13
- Window Start: 2026-08-19T02:32:45.400Z
- Window End: 2026-08-19T03:04:30.398Z
- Duration: 31.7 min (1904998 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 15
- Total Tokens: 8,521,450
- Cache Hit %: 99.7%
- Total USD: $2.8576
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 30
- cache_create_5m: 0
- cache_create_1h: 28,178
- cache_read: 8,483,684
- output: 9,558

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 15 msgs (100%), $2.8576 (100%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 2964
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Agent: 2
- Bash: 2

## Tool Result Sizes (bytes)

- count: 4
- sum: 1,290
- p50: 315
- p90: 606
- max: 606

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 628B results, ~21,324 cache_create tok (33.96×)
- Bash: 1 calls, 56B results, ~5,221 cache_create tok (93.23×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 15
- usd: $2.8576
- input: 30
- cache_create_5m: 0
- cache_create_1h: 28,178
- cache_read: 8,483,684
- output: 9,558

