---
kind: cost-report
feature: FEAT-191
run_title: "FEAT191 SLICE107"
usd: 79.6964
duration_ms: 655056
total_tokens: 47311390
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T12:46:39.978Z
---

# Cost Report: FEAT191 SLICE107

- Created: 2026-06-12T12:46:39.978Z
- Run Title: FEAT191 SLICE107
- Window Start: 2026-06-12T12:35:44.476Z
- Window End: 2026-06-12T12:46:39.532Z
- Duration: 10.9 min (655056 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 79
- Total Tokens: 47,311,390
- Cache Hit %: 99.7%
- Total USD: $79.6964
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 79
- cache_create_5m: 0
- cache_create_1h: 122,627
- cache_read: 47,117,482
- output: 71,202

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 79 msgs (100%), $79.6964 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Edit: 25 (1 failed)
- Bash: 20
- Read: 19
- Write: 1

## Tool Result Sizes (bytes)

- count: 66
- sum: 56,883
- p50: 168
- p90: 2,184
- max: 7,287

## File Re-reads

- redundant_read_count: 9
- top paths:
  - 4× C:\work\mega\loop\src\scripts\lib\slice-linker\start-slice.mts
  - 4× C:\work\mega\loop\src\scripts\lib\walker-gates.mts
  - 3× C:\work\mega\loop\src\tests\slice-build-routing.test.mts
  - 2× C:\work\mega\loop\src\tests\slice-linker.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 20 calls, 5,304B results, ~43,391 cache_create tok (8.18×)
- Edit: 25 calls, 3,955B results, ~38,565 cache_create tok (9.75×)
- Read: 19 calls, 40,203B results, ~26,596 cache_create tok (0.66×)
- Write: 1 calls, 134B results, ~2,339 cache_create tok (17.46×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 79
- usd: $79.6964
- input: 79
- cache_create_5m: 0
- cache_create_1h: 122,627
- cache_read: 47,117,482
- output: 71,202

