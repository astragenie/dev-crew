---
kind: cost-report
feature: FEAT-252
run_title: "FEAT252 SLICE158"
usd: 7.9578
duration_ms: 1735442
total_tokens: 21297555
cache_hit_pct: 99.4
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-10T13:32:36.911Z
---

# Cost Report: FEAT252 SLICE158

- Created: 2026-07-10T13:32:36.911Z
- Run Title: FEAT252 SLICE158
- Window Start: 2026-07-10T13:03:38.367Z
- Window End: 2026-07-10T13:32:33.809Z
- Duration: 28.9 min (1735442 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 75
- Total Tokens: 21,297,555
- Cache Hit %: 99.4%
- Total USD: $7.9578
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 16,607
- cache_create_5m: 0
- cache_create_1h: 105,138
- cache_read: 21,112,923
- output: 62,887

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 75 msgs (100%), $7.9578 (100%)

## Conversation Shape

- user_msg_count: 8
- user_msg_avg_len: 1942
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 13
- Edit: 12
- Write: 5
- Agent: 2
- SendMessage: 2
- ToolSearch: 1
- TaskCreate: 1
- TaskUpdate: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 38
- sum: 16,907
- p50: 252
- p90: 1,293
- max: 2,602

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 12 calls, 5,742B results, ~22,484 cache_create tok (3.92×)
- Edit: 12 calls, 3,024B results, ~16,986 cache_create tok (5.62×)
- SendMessage: 2 calls, 3,263B results, ~16,411 cache_create tok (5.03×)
- TaskCreate: 1 calls, 116B results, ~13,486 cache_create tok (116.26×)
- Write: 5 calls, 1,163B results, ~11,762 cache_create tok (10.11×)
- Agent: 2 calls, 612B results, ~10,950 cache_create tok (17.89×)
- TaskUpdate: 1 calls, 42B results, ~6,738 cache_create tok (160.43×)
- ToolSearch: 1 calls, 53B results, ~2,933 cache_create tok (55.34×)
- Read: 1 calls, 2,602B results, ~1,147 cache_create tok (0.44×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 75
- usd: $7.9578
- input: 16,607
- cache_create_5m: 0
- cache_create_1h: 105,138
- cache_read: 21,112,923
- output: 62,887

