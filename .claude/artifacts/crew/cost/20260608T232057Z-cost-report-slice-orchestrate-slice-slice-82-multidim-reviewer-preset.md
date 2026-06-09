---
kind: cost-report
slice: SLICE-82
run_title: "orchestrate-slice SLICE-82 multidim reviewer preset"
usd: 96.4374
duration_ms: 1497869
total_tokens: 22121065
cache_hit_pct: 93
review_decision: approved_with_notes
validation_decision: passed
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-08T23:20:57.420Z
---

# Cost Report: orchestrate-slice SLICE-82 multidim reviewer preset

- Created: 2026-06-08T23:20:57.420Z
- Run Title: orchestrate-slice SLICE-82 multidim reviewer preset
- Window Start: 2026-06-08T22:55:59.209Z
- Window End: 2026-06-08T23:20:57.078Z
- Duration: 25.0 min (1497869 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 171
- Total Tokens: 22,121,065
- Cache Hit %: 93%
- Total USD: $96.4374
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-82
- Grade Avg: -
- Review Decision: approved_with_notes
- Validation Decision: passed

## Tokens (totals)

- input: 421
- cache_create_5m: 0
- cache_create_1h: 1,504,176
- cache_read: 20,115,277
- output: 501,191

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 123 msgs (71.93%), $92.3232 (95.73%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 48 msgs (28.07%), $4.1141 (4.27%)

## Conversation Shape

- user_msg_count: 8
- user_msg_avg_len: 1943
- turns_before_first_tool: 0
- compaction_count: 2
- skill_invocations: 1
- subagent_dispatches: 22

## Tool Usage

- Bash: 25 (3 failed)
- Read: 23
- Agent: 22
- TaskCreate: 9
- TaskUpdate: 8
- Glob: 6
- Write: 6
- Grep: 3
- AskUserQuestion: 2
- Edit: 2
- ToolSearch: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 109
- sum: 206,974
- p50: 342
- p90: 8,321
- max: 15,386

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 3× C:\work\mega\loop\docs\research\2026-05-28-competitor-gap-audit\matrix.md
  - 2× C:\work\mega\loop\scripts\lib\reviewer-ladder.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 21 calls, 24,857B results, ~583,318 cache_create tok (23.47×)
- Read: 23 calls, 151,110B results, ~279,926 cache_create tok (1.85×)
- Bash: 25 calls, 8,910B results, ~246,649 cache_create tok (27.68×)
- TaskUpdate: 8 calls, 176B results, ~165,986 cache_create tok (943.1×)
- Write: 6 calls, 1,091B results, ~102,367 cache_create tok (93.83×)
- Glob: 6 calls, 10,399B results, ~63,983 cache_create tok (6.15×)
- Skill: 1 calls, 39B results, ~20,132 cache_create tok (516.21×)
- TaskCreate: 9 calls, 583B results, ~14,292 cache_create tok (24.51×)
- AskUserQuestion: 2 calls, 808B results, ~14,236 cache_create tok (17.62×)
- Grep: 3 calls, 5,696B results, ~7,970 cache_create tok (1.4×)
- Edit: 2 calls, 314B results, ~2,940 cache_create tok (9.36×)
- ToolSearch: 1 calls, 103B results, ~2,047 cache_create tok (19.87×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 48
- usd: $4.1141
- input: 68
- cache_create_5m: 0
- cache_create_1h: 313,250
- cache_read: 5,117,055
- output: 46,620

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 123
- usd: $92.3232
- input: 353
- cache_create_5m: 0
- cache_create_1h: 1,190,926
- cache_read: 14,998,222
- output: 454,571

