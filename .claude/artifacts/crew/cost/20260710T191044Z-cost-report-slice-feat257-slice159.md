---
kind: cost-report
feature: FEAT-257
run_title: "FEAT257 SLICE159"
usd: 31.9857
duration_ms: 3130454
total_tokens: 15111700
cache_hit_pct: 99
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-10T19:10:44.374Z
---

# Cost Report: FEAT257 SLICE159

- Created: 2026-07-10T19:10:44.375Z
- Run Title: FEAT257 SLICE159
- Window Start: 2026-07-10T18:18:33.283Z
- Window End: 2026-07-10T19:10:43.737Z
- Duration: 52.2 min (3130454 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 55
- Total Tokens: 15,111,700
- Cache Hit %: 99%
- Total USD: $31.9857
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 12,698
- cache_create_5m: 0
- cache_create_1h: 141,383
- cache_read: 14,887,996
- output: 69,623

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 55 msgs (100%), $31.9857 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 4132
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 4

## Tool Usage

- Bash: 10
- Agent: 4
- Write: 2
- ToolSearch: 1
- SendMessage: 1
- Skill: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 20
- sum: 27,174
- p50: 721
- p90: 3,612
- max: 7,249

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 4 calls, 12,030B results, ~44,583 cache_create tok (3.71×)
- Bash: 9 calls, 5,466B results, ~33,133 cache_create tok (6.06×)
- SendMessage: 1 calls, 426B results, ~17,532 cache_create tok (41.15×)
- Skill: 1 calls, 29B results, ~15,054 cache_create tok (519.1×)
- Write: 2 calls, 484B results, ~14,409 cache_create tok (29.77×)
- Read: 1 calls, 1,437B results, ~3,754 cache_create tok (2.61×)
- ToolSearch: 1 calls, 53B results, ~2,475 cache_create tok (46.7×)


## By Model (token detail)

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 55
- usd: $31.9857
- input: 12,698
- cache_create_5m: 0
- cache_create_1h: 141,383
- cache_read: 14,887,996
- output: 69,623

