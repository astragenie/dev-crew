---
kind: cost-report
feature: FEAT-039
run_title: "FEAT039 SLICE37"
usd: 18.3624
duration_ms: 3422938
total_tokens: 41361306
cache_hit_pct: 98.5
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T21:19:15.077Z
---

# Cost Report: FEAT039 SLICE37

- Created: 2026-06-04T21:19:15.077Z
- Run Title: FEAT039 SLICE37
- Window Start: 2026-06-04T20:22:12.073Z
- Window End: 2026-06-04T21:19:15.011Z
- Duration: 57.0 min (3422938 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 340
- Total Tokens: 41,361,306
- Cache Hit %: 98.5%
- Total USD: $18.3624
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 614
- cache_create_5m: 0
- cache_create_1h: 615,945
- cache_read: 40,578,662
- output: 166,085

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 340 msgs (100%), $18.3624 (100%)

## Conversation Shape

- user_msg_count: 15
- user_msg_avg_len: 927
- turns_before_first_tool: 2
- compaction_count: 4
- skill_invocations: 2
- subagent_dispatches: 7

## Tool Usage

- Bash: 79 (2 failed)
- Edit: 36 (4 failed)
- Read: 31
- TaskUpdate: 14
- Agent: 7
- Grep: 7
- TaskCreate: 7
- Glob: 4
- ToolSearch: 3
- Write: 2
- Skill: 2

## Tool Result Sizes (bytes)

- count: 194
- sum: 151,237
- p50: 227
- p90: 1,870
- max: 9,001

## File Re-reads

- redundant_read_count: 17
- top paths:
  - 9× C:\work\mega\loop\.claude\worktrees\feat+012-checkpoint-wip-commits\src\scripts\lib\slice-linker\start-slice.mts
  - 4× C:\work\mega\loop\src\scripts\lib\stop-conditions.mts
  - 4× C:\work\mega\loop\.claude\worktrees\feat+012-checkpoint-wip-commits\src\scripts\lib\slice-linker\dispatch.mts
  - 4× C:\work\mega\loop\.claude\worktrees\feat+012-checkpoint-wip-commits\src\tests\slice-linker.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 79 calls, 56,029B results, ~306,589 cache_create tok (5.47×)
- Edit: 36 calls, 7,139B results, ~148,423 cache_create tok (20.79×)
- Read: 31 calls, 53,216B results, ~52,669 cache_create tok (0.99×)
- Agent: 7 calls, 9,798B results, ~43,774 cache_create tok (4.47×)
- Write: 2 calls, 461B results, ~20,967 cache_create tok (45.48×)
- ToolSearch: 3 calls, 307B results, ~13,050 cache_create tok (42.51×)
- Skill: 2 calls, 86B results, ~10,302 cache_create tok (119.79×)
- TaskUpdate: 14 calls, 308B results, ~5,162 cache_create tok (16.76×)
- Grep: 7 calls, 5,977B results, ~5,131 cache_create tok (0.86×)
- TaskCreate: 7 calls, 564B results, ~1,187 cache_create tok (2.1×)
- Glob: 4 calls, 135B results, ~498 cache_create tok (3.69×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 340
- usd: $18.3624
- input: 614
- cache_create_5m: 0
- cache_create_1h: 615,945
- cache_read: 40,578,662
- output: 166,085

