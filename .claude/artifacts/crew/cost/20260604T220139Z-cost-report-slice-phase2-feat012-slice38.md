---
kind: cost-report
phase: "2"
feature: FEAT-012
run_title: "PHASE2 FEAT012 SLICE38"
usd: 6.7222
duration_ms: 746459
total_tokens: 5062311
cache_hit_pct: 93.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T22:01:39.968Z
---

# Cost Report: PHASE2 FEAT012 SLICE38

- Created: 2026-06-04T22:01:39.968Z
- Run Title: PHASE2 FEAT012 SLICE38
- Window Start: 2026-06-04T21:49:03.083Z
- Window End: 2026-06-04T22:01:29.542Z
- Duration: 12.4 min (746459 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 60
- Total Tokens: 5,062,311
- Cache Hit %: 93.8%
- Total USD: $6.7222
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 82
- cache_create_5m: 0
- cache_create_1h: 313,892
- cache_read: 4,713,826
- output: 34,511

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 4 msgs (6.67%), $3.6335 (54.05%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 56 msgs (93.33%), $3.0887 (45.95%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 6047
- turns_before_first_tool: 1
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 2

## Tool Usage

- Bash: 17 (4 failed)
- Read: 6
- Write: 3
- Edit: 3
- Agent: 2
- Skill: 1
- Glob: 1

## Tool Result Sizes (bytes)

- count: 33
- sum: 43,449
- p50: 341
- p90: 4,337
- max: 10,040

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\slice-linker.mts
  - 2× C:\work\mega\loop\src\tests\loop-installer.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Write: 3 calls, 461B results, ~122,497 cache_create tok (265.72×)
- Read: 6 calls, 7,527B results, ~46,707 cache_create tok (6.21×)
- Bash: 16 calls, 18,367B results, ~20,757 cache_create tok (1.13×)
- Agent: 2 calls, 8,930B results, ~19,497 cache_create tok (2.18×)
- Skill: 1 calls, 27B results, ~5,582 cache_create tok (206.74×)
- Edit: 3 calls, 472B results, ~1,166 cache_create tok (2.47×)
- Glob: 1 calls, 31B results, ~368 cache_create tok (11.87×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 4
- usd: $3.6335
- input: 14
- cache_create_5m: 0
- cache_create_1h: 102,982
- cache_read: 178,270
- output: 3,686

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 56
- usd: $3.0887
- input: 68
- cache_create_5m: 0
- cache_create_1h: 210,910
- cache_read: 4,535,556
- output: 30,825

