---
kind: cost-report
phase: "2"
feature: FEAT-010
run_title: "PHASE2 FEAT010 SLICE36"
usd: 85.9655
duration_ms: 671141
total_tokens: 52799515
cache_hit_pct: 99.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T17:19:58.705Z
---

# Cost Report: PHASE2 FEAT010 SLICE36

- Created: 2026-06-04T17:19:58.705Z
- Run Title: PHASE2 FEAT010 SLICE36
- Window Start: 2026-06-04T17:08:47.518Z
- Window End: 2026-06-04T17:19:58.659Z
- Duration: 11.2 min (671141 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 91
- Total Tokens: 52,799,515
- Cache Hit %: 99.8%
- Total USD: $85.9655
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 116
- cache_create_5m: 0
- cache_create_1h: 105,740
- cache_read: 52,642,624
- output: 51,035

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 91 msgs (100%), $85.9655 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 64
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 31
- Read: 10
- Edit: 9 (1 failed)
- AskUserQuestion: 3
- Grep: 2
- Agent: 1
- Write: 1
- Glob: 1

## Tool Result Sizes (bytes)

- count: 59
- sum: 41,232
- p50: 430
- p90: 1,898
- max: 3,350

## File Re-reads

- redundant_read_count: 6
- top paths:
  - 7× C:\work\mega\loop\src\scripts\lib\slice-linker\start-slice.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 31 calls, 16,772B results, ~45,687 cache_create tok (2.72×)
- Read: 10 calls, 18,038B results, ~18,116 cache_create tok (1×)
- Edit: 9 calls, 1,471B results, ~15,121 cache_create tok (10.28×)
- Agent: 1 calls, 279B results, ~13,380 cache_create tok (47.96×)
- AskUserQuestion: 3 calls, 453B results, ~6,336 cache_create tok (13.99×)
- Grep: 2 calls, 3,887B results, ~2,242 cache_create tok (0.58×)
- Write: 1 calls, 182B results, ~2,017 cache_create tok (11.08×)
- Glob: 1 calls, 113B results, ~193 cache_create tok (1.71×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 91
- usd: $85.9655
- input: 116
- cache_create_5m: 0
- cache_create_1h: 105,740
- cache_read: 52,642,624
- output: 51,035

