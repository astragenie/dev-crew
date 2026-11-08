---
kind: cost-report
feature: FEAT-037
run_title: "FEAT037 SLICE56"
usd: 15.2746
duration_ms: 2054207
total_tokens: 22557795
cache_hit_pct: 99.2
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
run_id: "2026-11-08T23:10:56.259Z_2026-11-08T23:45:10.466Z"
created_at: 2026-11-08T23:45:10.726Z
---

# Cost Report: FEAT037 SLICE56

- Created: 2026-11-08T23:45:10.726Z
- Run Title: FEAT037 SLICE56
- Window Start: 2026-11-08T23:10:56.259Z
- Window End: 2026-11-08T23:45:10.466Z
- Duration: 34.2 min (2054207 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 87
- Total Tokens: 22,557,795
- Cache Hit %: 99.2%
- Total USD: $15.2746
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 1,644
- cache_create_5m: 0
- cache_create_1h: 182,538
- cache_read: 22,252,729
- output: 120,884

## Model Mix

- claude-fable-5-1 (priced as claude-fable-5-1): 87 msgs (100%), $15.2746 (100%)

## Conversation Shape

- user_msg_count: 18
- user_msg_avg_len: 2399
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 8

## Tool Usage

- Bash: 18 (2 failed)
- Agent: 8
- ToolSearch: 1
- SendMessage: 1

## Tool Result Sizes (bytes)

- count: 28
- sum: 33,661
- p50: 448
- p90: 1,490
- max: 16,082

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 17 calls, 14,633B results, ~84,611 cache_create tok (5.78×)
- Agent: 8 calls, 2,516B results, ~66,973 cache_create tok (26.62×)
- SendMessage: 1 calls, 377B results, ~4,134 cache_create tok (10.97×)
- ToolSearch: 1 calls, 53B results, ~2,775 cache_create tok (52.36×)


## By Model (token detail)

### claude-fable-5-1 (priced as claude-fable-5-1)
- messages: 87
- usd: $15.2746
- input: 1,644
- cache_create_5m: 0
- cache_create_1h: 182,538
- cache_read: 22,252,729
- output: 120,884

