---
kind: cost-report
feature: FEAT-028
run_title: "FEAT028 SLICE54"
usd: 26.3593
duration_ms: 43598413
total_tokens: 33654888
cache_hit_pct: 98.5
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
run_id: "2026-11-06T05:19:31.430Z_2026-11-06T17:26:09.843Z"
created_at: 2026-11-06T17:26:10.005Z
---

# Cost Report: FEAT028 SLICE54

- Created: 2026-11-06T17:26:10.005Z
- Run Title: FEAT028 SLICE54
- Window Start: 2026-11-06T05:19:31.430Z
- Window End: 2026-11-06T17:26:09.843Z
- Duration: 726.6 min (43598413 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 153
- Total Tokens: 33,654,888
- Cache Hit %: 98.5%
- Total USD: $26.3593
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 3,054
- cache_create_5m: 0
- cache_create_1h: 493,745
- cache_read: 32,962,919
- output: 195,170

## Model Mix

- claude-fable-5-1 (priced as claude-fable-5-1): 138 msgs (90.2%), $23.6430 (89.7%)
- claude-opus-5 (priced as claude-opus-5): 15 msgs (9.8%), $2.7162 (10.3%)

## Conversation Shape

- user_msg_count: 29
- user_msg_avg_len: 2730
- turns_before_first_tool: 2
- compaction_count: 3
- skill_invocations: 2
- subagent_dispatches: 14

## Tool Usage

- Bash: 35 (1 failed)
- Agent: 14
- SendMessage: 10
- Skill: 2
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 62
- sum: 103,435
- p50: 379
- p90: 4,170
- max: 17,957

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 34 calls, 93,398B results, ~198,057 cache_create tok (2.12×)
- Agent: 14 calls, 6,789B results, ~88,290 cache_create tok (13×)
- SendMessage: 10 calls, 2,951B results, ~35,473 cache_create tok (12.02×)
- Skill: 2 calls, 68B results, ~12,270 cache_create tok (180.44×)
- ToolSearch: 1 calls, 53B results, ~2,932 cache_create tok (55.32×)


## By Model (token detail)

### claude-fable-5-1 (priced as claude-fable-5-1)
- messages: 138
- usd: $23.6430
- input: 3,024
- cache_create_5m: 0
- cache_create_1h: 469,960
- cache_read: 22,847,237
- output: 170,036

### claude-opus-5 (priced as claude-opus-5)
- messages: 15
- usd: $2.7162
- input: 30
- cache_create_5m: 0
- cache_create_1h: 23,785
- cache_read: 10,115,682
- output: 25,134

