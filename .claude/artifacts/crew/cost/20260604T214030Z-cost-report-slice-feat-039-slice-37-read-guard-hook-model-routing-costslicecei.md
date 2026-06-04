---
kind: cost-report
slice: SLICE-37
run_title: "FEAT-039 SLICE-37 — read-guard hook + model routing + costSliceCeiling — shipped v0.7.4"
usd: 28.7872
duration_ms: 4697879
total_tokens: 60872200
cache_hit_pct: 98.0
review_decision: approved
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T21:40:30.031Z
---

# Cost Report: FEAT-039 SLICE-37 — read-guard hook + model routing + costSliceCeiling — shipped v0.7.4

- Created: 2026-06-04T21:40:30.031Z
- Run Title: FEAT-039 SLICE-37 — read-guard hook + model routing + costSliceCeiling — shipped v0.7.4
- Window Start: 2026-06-04T20:22:12.073Z
- Window End: 2026-06-04T21:40:29.952Z
- Duration: 78.3 min (4697879 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 515
- Total Tokens: 60,872,200
- Cache Hit %: 98.0%
- Total USD: $28.7872
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-37
- Grade Avg: -
- Review Decision: approved
- Validation Decision: -

## Tokens (totals)

- input: 865
- cache_create_5m: 0
- cache_create_1h: 1,230,617
- cache_read: 59,402,030
- output: 238,688

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 515 msgs (100%), $28.7872 (100%)

## Conversation Shape

- user_msg_count: 37
- user_msg_avg_len: 759
- turns_before_first_tool: 2
- compaction_count: 9
- skill_invocations: 2
- subagent_dispatches: 7

## Tool Usage

- Bash: 147 (7 failed)
- Edit: 44 (5 failed)
- Read: 42
- TaskUpdate: 14
- Agent: 7
- Grep: 7
- TaskCreate: 7
- Glob: 7
- Write: 4
- ToolSearch: 3
- Skill: 2
- PowerShell: 1

## Tool Result Sizes (bytes)

- count: 286
- sum: 363,169
- p50: 237
- p90: 2,158
- max: 72,807

## File Re-reads

- redundant_read_count: 20
- top paths:
  - 9× C:\work\mega\loop\.claude\worktrees\feat+012-checkpoint-wip-commits\src\scripts\lib\slice-linker\start-slice.mts
  - 4× C:\work\mega\loop\src\scripts\lib\stop-conditions.mts
  - 4× C:\work\mega\loop\.claude\worktrees\feat+012-checkpoint-wip-commits\src\scripts\lib\slice-linker\dispatch.mts
  - 4× C:\work\mega\loop\.claude\worktrees\feat+012-checkpoint-wip-commits\src\tests\slice-linker.test.mts
  - 2× C:\work\mega\loop\CHANGELOG.md

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 146 calls, 122,164B results, ~662,172 cache_create tok (5.42×)
- Read: 42 calls, 197,332B results, ~300,571 cache_create tok (1.52×)
- Edit: 44 calls, 8,234B results, ~152,171 cache_create tok (18.48×)
- Agent: 7 calls, 9,798B results, ~43,774 cache_create tok (4.47×)
- Write: 4 calls, 941B results, ~25,874 cache_create tok (27.5×)
- ToolSearch: 3 calls, 307B results, ~13,050 cache_create tok (42.51×)
- Skill: 2 calls, 86B results, ~10,302 cache_create tok (119.79×)
- TaskUpdate: 14 calls, 308B results, ~5,162 cache_create tok (16.76×)
- Grep: 7 calls, 5,977B results, ~5,131 cache_create tok (0.86×)
- Glob: 7 calls, 234B results, ~2,799 cache_create tok (11.96×)
- TaskCreate: 7 calls, 564B results, ~1,187 cache_create tok (2.1×)
- PowerShell: 1 calls, 7B results, ~231 cache_create tok (33×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 515
- usd: $28.7872
- input: 865
- cache_create_5m: 0
- cache_create_1h: 1,230,617
- cache_read: 59,402,030
- output: 238,688

