---
kind: cost-report
run_title: "Walker plan emits lead-routing when orchestratorMode=lead"
usd: 18.6318
duration_ms: 451696
total_tokens: 10045977
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-11T00:01:12.809Z
---

# Cost Report: Walker plan emits lead-routing when orchestratorMode=lead

- Created: 2026-06-11T00:01:12.809Z
- Run Title: Walker plan emits lead-routing when orchestratorMode=lead
- Window Start: 2026-06-10T23:53:40.655Z
- Window End: 2026-06-11T00:01:12.351Z
- Duration: 7.5 min (451696 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 34
- Total Tokens: 10,045,977
- Cache Hit %: 99.7%
- Total USD: $18.6318
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 34
- cache_create_5m: 0
- cache_create_1h: 34,389
- cache_read: 9,976,421
- output: 35,133

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 34 msgs (100%), $18.6318 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 11
- Edit: 9
- Read: 5

## Tool Result Sizes (bytes)

- count: 26
- sum: 17,110
- p50: 209
- p90: 2,984
- max: 3,651

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\walker-gates.mts
  - 2× C:\work\mega\loop\src\tests\auto-walker.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Edit: 9 calls, 1,384B results, ~19,886 cache_create tok (14.37×)
- Bash: 11 calls, 3,556B results, ~7,527 cache_create tok (2.12×)
- Read: 5 calls, 11,918B results, ~6,028 cache_create tok (0.51×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 34
- usd: $18.6318
- input: 34
- cache_create_5m: 0
- cache_create_1h: 34,389
- cache_read: 9,976,421
- output: 35,133

