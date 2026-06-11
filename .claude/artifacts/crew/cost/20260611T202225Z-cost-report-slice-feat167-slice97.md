---
kind: cost-report
feature: FEAT-167
run_title: "FEAT167 SLICE97"
usd: 6.9853
duration_ms: 811897
total_tokens: 3055334
cache_hit_pct: 98.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-11T20:22:25.894Z
---

# Cost Report: FEAT167 SLICE97

- Created: 2026-06-11T20:22:25.894Z
- Run Title: FEAT167 SLICE97
- Window Start: 2026-06-11T20:08:53.605Z
- Window End: 2026-06-11T20:22:25.502Z
- Duration: 13.5 min (811897 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 26
- Total Tokens: 3,055,334
- Cache Hit %: 98.9%
- Total USD: $6.9853
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 26
- cache_create_5m: 0
- cache_create_1h: 34,590
- cache_read: 3,001,451
- output: 19,267

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 26 msgs (100%), $6.9853 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 9
- ToolSearch: 1
- Agent: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 13
- sum: 12,087
- p50: 488
- p90: 1,879
- max: 3,245

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 9 calls, 8,197B results, ~17,465 cache_create tok (2.13×)
- Agent: 1 calls, 313B results, ~6,120 cache_create tok (19.55×)
- Read: 1 calls, 3,245B results, ~3,266 cache_create tok (1.01×)
- ToolSearch: 1 calls, 32B results, ~740 cache_create tok (23.13×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 26
- usd: $6.9853
- input: 26
- cache_create_5m: 0
- cache_create_1h: 34,590
- cache_read: 3,001,451
- output: 19,267

