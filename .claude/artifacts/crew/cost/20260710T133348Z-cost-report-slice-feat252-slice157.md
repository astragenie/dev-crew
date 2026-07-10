---
kind: cost-report
feature: FEAT-252
run_title: "FEAT252 SLICE157"
usd: 8.8717
duration_ms: 1808821
total_tokens: 24036136
cache_hit_pct: 99.5
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-10T13:33:48.162Z
---

# Cost Report: FEAT252 SLICE157

- Created: 2026-07-10T13:33:48.162Z
- Run Title: FEAT252 SLICE157
- Window Start: 2026-07-10T13:03:38.367Z
- Window End: 2026-07-10T13:33:47.188Z
- Duration: 30.1 min (1808821 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 84
- Total Tokens: 24,036,136
- Cache Hit %: 99.5%
- Total USD: $8.8717
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 17,198
- cache_create_5m: 0
- cache_create_1h: 110,486
- cache_read: 23,841,470
- output: 66,982

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 84 msgs (100%), $8.8717 (100%)

## Conversation Shape

- user_msg_count: 8
- user_msg_avg_len: 1942
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 16
- Edit: 13
- Write: 5
- Agent: 2
- SendMessage: 2
- ToolSearch: 1
- TaskCreate: 1
- TaskUpdate: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 42
- sum: 18,874
- p50: 252
- p90: 881
- max: 2,602

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 15 calls, 7,476B results, ~27,399 cache_create tok (3.66×)
- Edit: 13 calls, 3,257B results, ~17,419 cache_create tok (5.35×)
- SendMessage: 2 calls, 3,263B results, ~16,411 cache_create tok (5.03×)
- TaskCreate: 1 calls, 116B results, ~13,486 cache_create tok (116.26×)
- Write: 5 calls, 1,163B results, ~11,762 cache_create tok (10.11×)
- Agent: 2 calls, 612B results, ~10,950 cache_create tok (17.89×)
- TaskUpdate: 1 calls, 42B results, ~6,738 cache_create tok (160.43×)
- ToolSearch: 1 calls, 53B results, ~2,933 cache_create tok (55.34×)
- Read: 1 calls, 2,602B results, ~1,147 cache_create tok (0.44×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 84
- usd: $8.8717
- input: 17,198
- cache_create_5m: 0
- cache_create_1h: 110,486
- cache_read: 23,841,470
- output: 66,982

