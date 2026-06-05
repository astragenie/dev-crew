---
kind: cost-report
feature: FEAT-046
run_title: "FEAT046 SLICE49"
usd: 3.5838
duration_ms: 2293638
total_tokens: 7358498
cache_hit_pct: 98.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T10:28:40.408Z
---

# Cost Report: FEAT046 SLICE49

- Created: 2026-06-05T10:28:40.408Z
- Run Title: FEAT046 SLICE49
- Window Start: 2026-06-05T09:50:26.647Z
- Window End: 2026-06-05T10:28:40.285Z
- Duration: 38.2 min (2293638 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 50
- Total Tokens: 7,358,498
- Cache Hit %: 98.7%
- Total USD: $3.5838
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 2,046
- cache_create_5m: 0
- cache_create_1h: 92,061
- cache_read: 7,206,842
- output: 57,549

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 50 msgs (100%), $3.5838 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 24
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 9

## Tool Usage

- Bash: 16 (1 failed)
- Agent: 9
- Edit: 4
- Read: 2
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 33
- sum: 31,182
- p50: 399
- p90: 2,156
- max: 4,870

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 9 calls, 17,131B results, ~70,717 cache_create tok (4.13×)
- Bash: 16 calls, 11,977B results, ~11,624 cache_create tok (0.97×)
- ToolSearch: 1 calls, 55B results, ~4,704 cache_create tok (85.53×)
- Edit: 4 calls, 577B results, ~3,602 cache_create tok (6.24×)
- Read: 2 calls, 1,153B results, ~572 cache_create tok (0.5×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 50
- usd: $3.5838
- input: 2,046
- cache_create_5m: 0
- cache_create_1h: 92,061
- cache_read: 7,206,842
- output: 57,549

