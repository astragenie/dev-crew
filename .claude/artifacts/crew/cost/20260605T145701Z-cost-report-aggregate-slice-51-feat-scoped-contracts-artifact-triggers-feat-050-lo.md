---
kind: cost-report
slice: SLICE-51
run_title: "SLICE-51: FEAT-scoped contracts artifact triggers — FEAT-050 loop-side"
usd: 104.4572
duration_ms: 1349606
total_tokens: 57016455
cache_hit_pct: 99.6
validation_decision: passed
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-05T14:57:01.969Z
---

# Cost Report: SLICE-51: FEAT-scoped contracts artifact triggers — FEAT-050 loop-side

- Created: 2026-06-05T14:57:01.969Z
- Run Title: SLICE-51: FEAT-scoped contracts artifact triggers — FEAT-050 loop-side
- Window Start: 2026-06-05T14:34:30.103Z
- Window End: 2026-06-05T14:56:59.709Z
- Duration: 22.5 min (1349606 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 154
- Total Tokens: 57,016,455
- Cache Hit %: 99.6%
- Total USD: $104.4572
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 110 msgs, $71.9111
- C--work-mega-loop: 44 msgs, $32.5461

## Outcome Linkage

- Slice: SLICE-51
- Grade Avg: -
- Review Decision: -
- Validation Decision: passed

## Tokens (totals)

- input: 194
- cache_create_5m: 0
- cache_create_1h: 246,967
- cache_read: 56,607,507
- output: 161,787

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 154 msgs (100%), $104.4572 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 11

## Tool Usage

- Bash: 34 (1 failed)
- Edit: 21 (2 failed)
- Read: 13
- Agent: 11
- Grep: 5
- Glob: 3
- Write: 2 (1 failed)

## Tool Result Sizes (bytes)

- count: 90
- sum: 69,714
- p50: 261
- p90: 2,339
- max: 8,211

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 34 calls, 26,767B results, ~78,577 cache_create tok (2.94×)
- Agent: 11 calls, 15,814B results, ~72,689 cache_create tok (4.6×)
- Edit: 21 calls, 3,784B results, ~40,662 cache_create tok (10.75×)
- Read: 13 calls, 19,815B results, ~26,558 cache_create tok (1.34×)
- Write: 2 calls, 291B results, ~8,179 cache_create tok (28.11×)
- Glob: 3 calls, 423B results, ~4,275 cache_create tok (10.11×)
- Grep: 5 calls, 561B results, ~2,434 cache_create tok (4.34×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 154
- usd: $104.4572
- input: 194
- cache_create_5m: 0
- cache_create_1h: 246,967
- cache_read: 56,607,507
- output: 161,787

