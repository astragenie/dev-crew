---
kind: cost-report
feature: FEAT-082
run_title: "FEAT082 SLICE86"
usd: 15.3126
duration_ms: 3906486
total_tokens: 22513495
cache_hit_pct: 97.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-09T17:41:41.010Z
---

# Cost Report: FEAT082 SLICE86

- Created: 2026-06-09T17:41:41.010Z
- Run Title: FEAT082 SLICE86
- Window Start: 2026-06-09T16:36:34.336Z
- Window End: 2026-06-09T17:41:40.822Z
- Duration: 65.1 min (3906486 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 203
- Total Tokens: 22,513,495
- Cache Hit %: 97.9%
- Total USD: $15.3126
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 3,965
- cache_create_5m: 213,425
- cache_create_1h: 259,404
- cache_read: 21,952,462
- output: 84,239

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 174 msgs (85.71%), $8.9443 (58.41%)
- claude-opus-4-7 (priced as claude-opus-4): 29 msgs (14.29%), $6.3683 (41.59%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 12783
- turns_before_first_tool: 1
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 6

## Tool Usage

- Bash: 40 (1 failed)
- Read: 26 (3 failed)
- Grep: 9
- Agent: 6
- Edit: 5 (1 failed)
- StructuredOutput: 2
- Glob: 2
- Skill: 1

## Tool Result Sizes (bytes)

- count: 91
- sum: 110,602
- p50: 477
- p90: 2,537
- max: 10,039

## File Re-reads

- redundant_read_count: 13
- top paths:
  - 7× C:\work\mega\loop\src\scripts\lib\loop-installer-tokens.mts
  - 5× C:\work\mega\loop\src\tests\loop-installer-tokens.test.mts
  - 2× /home/user/src/scripts/lib/loop-installer-tokens.mts
  - 2× C:\Users\milas\AppData\Local\Temp\claude\C--work-mega-loop\31d05419-60c1-4ff0-a2a8-d4c1f610c8ac\tasks\bqfgnzh47.output
  - 2× C:\Users\milas\AppData\Local\Temp\claude\C--work-mega-loop\31d05419-60c1-4ff0-a2a8-d4c1f610c8ac\tasks\b9q1320s7.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 26 calls, 60,805B results, ~193,625 cache_create tok (3.18×)
- StructuredOutput: 2 calls, 78B results, ~90,101 cache_create tok (1155.14×)
- Bash: 39 calls, 28,863B results, ~54,257 cache_create tok (1.88×)
- Agent: 6 calls, 11,779B results, ~33,443 cache_create tok (2.84×)
- Grep: 9 calls, 7,887B results, ~27,015 cache_create tok (3.43×)
- Edit: 5 calls, 806B results, ~17,446 cache_create tok (21.65×)
- Skill: 1 calls, 36B results, ~2,488 cache_create tok (69.11×)
- Glob: 2 calls, 180B results, ~1,382 cache_create tok (7.68×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 29
- usd: $6.3683
- input: 54
- cache_create_5m: 213,425
- cache_create_1h: 0
- cache_read: 931,318
- output: 12,917

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 174
- usd: $8.9443
- input: 3,911
- cache_create_5m: 0
- cache_create_1h: 259,404
- cache_read: 21,021,144
- output: 71,322

