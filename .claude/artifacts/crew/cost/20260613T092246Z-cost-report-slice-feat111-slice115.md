---
kind: cost-report
feature: FEAT-111
run_title: "FEAT111 SLICE115"
usd: 3.5603
duration_ms: 1797853
total_tokens: 7100863
cache_hit_pct: 98.5
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T09:22:46.363Z
---

# Cost Report: FEAT111 SLICE115

- Created: 2026-06-13T09:22:46.363Z
- Run Title: FEAT111 SLICE115
- Window Start: 2026-06-13T08:52:48.034Z
- Window End: 2026-06-13T09:22:45.887Z
- Duration: 30.0 min (1797853 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 49
- Total Tokens: 7,100,863
- Cache Hit %: 98.5%
- Total USD: $3.5603
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 67
- cache_create_5m: 0
- cache_create_1h: 104,544
- cache_read: 6,939,522
- output: 56,730

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 49 msgs (100%), $3.5603 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 395
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 10

## Tool Usage

- Bash: 15
- Agent: 10
- Edit: 3
- Read: 2

## Tool Result Sizes (bytes)

- count: 31
- sum: 43,343
- p50: 784
- p90: 2,528
- max: 7,266

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 10 calls, 16,049B results, ~55,010 cache_create tok (3.43×)
- Bash: 15 calls, 14,745B results, ~29,662 cache_create tok (2.01×)
- Read: 2 calls, 10,654B results, ~11,562 cache_create tok (1.09×)
- Edit: 3 calls, 499B results, ~6,866 cache_create tok (13.76×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 49
- usd: $3.5603
- input: 67
- cache_create_5m: 0
- cache_create_1h: 104,544
- cache_read: 6,939,522
- output: 56,730

