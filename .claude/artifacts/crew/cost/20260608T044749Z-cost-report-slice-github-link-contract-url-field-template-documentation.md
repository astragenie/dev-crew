---
kind: cost-report
run_title: "github-link contract: URL field + template documentation"
usd: 38.8225
duration_ms: 959946
total_tokens: 14226897
cache_hit_pct: 97
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-08T04:47:49.494Z
---

# Cost Report: github-link contract: URL field + template documentation

- Created: 2026-06-08T04:47:49.494Z
- Run Title: github-link contract: URL field + template documentation
- Window Start: 2026-06-08T04:31:49.184Z
- Window End: 2026-06-08T04:47:49.130Z
- Duration: 16.0 min (959946 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 101
- Total Tokens: 14,226,897
- Cache Hit %: 97%
- Total USD: $38.8225
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 116
- cache_create_5m: 0
- cache_create_1h: 421,321
- cache_read: 13,730,998
- output: 74,462

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 101 msgs (100%), $38.8225 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 22 (4 failed)
- Read: 16
- TaskUpdate: 16
- Edit: 9
- TaskCreate: 8
- Glob: 3 (1 failed)
- ToolSearch: 2
- Grep: 1
- Agent: 1

## Tool Result Sizes (bytes)

- count: 78
- sum: 89,223
- p50: 150
- p90: 2,880
- max: 20,686

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\tests\github-sync.test.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Grep: 1 calls, 14B results, ~204,084 cache_create tok (14577.43×)
- Read: 16 calls, 64,391B results, ~129,876 cache_create tok (2.02×)
- Bash: 21 calls, 15,082B results, ~33,640 cache_create tok (2.23×)
- Edit: 9 calls, 1,374B results, ~14,355 cache_create tok (10.45×)
- Agent: 1 calls, 6,336B results, ~11,670 cache_create tok (1.84×)
- TaskUpdate: 15 calls, 330B results, ~11,586 cache_create tok (35.11×)
- ToolSearch: 2 calls, 104B results, ~6,797 cache_create tok (65.36×)
- TaskCreate: 8 calls, 525B results, ~6,084 cache_create tok (11.59×)
- Glob: 3 calls, 172B results, ~1,032 cache_create tok (6×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 101
- usd: $38.8225
- input: 116
- cache_create_5m: 0
- cache_create_1h: 421,321
- cache_read: 13,730,998
- output: 74,462

