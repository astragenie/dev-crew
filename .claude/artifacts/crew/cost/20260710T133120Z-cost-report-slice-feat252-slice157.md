---
kind: cost-report
feature: FEAT-252
run_title: "FEAT252 SLICE157"
usd: 7.1382
duration_ms: 1661010
total_tokens: 18884797
cache_hit_pct: 99.4
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-10T13:31:20.394Z
---

# Cost Report: FEAT252 SLICE157

- Created: 2026-07-10T13:31:20.394Z
- Run Title: FEAT252 SLICE157
- Window Start: 2026-07-10T13:03:38.367Z
- Window End: 2026-07-10T13:31:19.377Z
- Duration: 27.7 min (1661010 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 67
- Total Tokens: 18,884,797
- Cache Hit %: 99.4%
- Total USD: $7.1382
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 16,591
- cache_create_5m: 0
- cache_create_1h: 99,122
- cache_read: 18,710,379
- output: 58,705

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 67 msgs (100%), $7.1382 (100%)

## Conversation Shape

- user_msg_count: 8
- user_msg_avg_len: 1942
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Edit: 12
- Bash: 10
- Write: 4
- Agent: 2
- SendMessage: 2
- ToolSearch: 1
- TaskCreate: 1
- TaskUpdate: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 34
- sum: 14,432
- p50: 252
- p90: 881
- max: 2,602

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 9 calls, 3,490B results, ~17,258 cache_create tok (4.94×)
- Edit: 12 calls, 3,024B results, ~16,986 cache_create tok (5.62×)
- SendMessage: 2 calls, 3,263B results, ~16,411 cache_create tok (5.03×)
- TaskCreate: 1 calls, 116B results, ~13,486 cache_create tok (116.26×)
- Write: 4 calls, 940B results, ~10,972 cache_create tok (11.67×)
- Agent: 2 calls, 612B results, ~10,950 cache_create tok (17.89×)
- TaskUpdate: 1 calls, 42B results, ~6,738 cache_create tok (160.43×)
- ToolSearch: 1 calls, 53B results, ~2,933 cache_create tok (55.34×)
- Read: 1 calls, 2,602B results, ~1,147 cache_create tok (0.44×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 67
- usd: $7.1382
- input: 16,591
- cache_create_5m: 0
- cache_create_1h: 99,122
- cache_read: 18,710,379
- output: 58,705

