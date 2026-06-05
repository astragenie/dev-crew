---
kind: cost-report
slice: SLICE-51
run_title: "SLICE-51: FEAT-scoped contracts artifact triggers — FEAT-050 loop-side"
usd: 32.5461
duration_ms: 1349606
total_tokens: 17682708
cache_hit_pct: 99.6
validation_decision: passed
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T14:56:59.874Z
---

# Cost Report: SLICE-51: FEAT-scoped contracts artifact triggers — FEAT-050 loop-side

- Created: 2026-06-05T14:56:59.874Z
- Run Title: SLICE-51: FEAT-scoped contracts artifact triggers — FEAT-050 loop-side
- Window Start: 2026-06-05T14:34:30.103Z
- Window End: 2026-06-05T14:56:59.709Z
- Duration: 22.5 min (1349606 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 44
- Total Tokens: 17,682,708
- Cache Hit %: 99.6%
- Total USD: $32.5461
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-51
- Grade Avg: -
- Review Decision: -
- Validation Decision: passed

## Tokens (totals)

- input: 84
- cache_create_5m: 0
- cache_create_1h: 76,189
- cache_read: 17,554,060
- output: 52,375

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 44 msgs (100%), $32.5461 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 6

## Tool Usage

- Bash: 9 (1 failed)
- Agent: 6
- Edit: 6 (2 failed)
- Read: 2
- Grep: 1

## Tool Result Sizes (bytes)

- count: 25
- sum: 14,382
- p50: 321
- p90: 1,480
- max: 2,340

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 6 calls, 7,580B results, ~36,145 cache_create tok (4.77×)
- Bash: 9 calls, 2,142B results, ~16,788 cache_create tok (7.84×)
- Edit: 6 calls, 852B results, ~7,650 cache_create tok (8.98×)
- Read: 2 calls, 1,335B results, ~1,758 cache_create tok (1.32×)
- Grep: 1 calls, 214B results, ~255 cache_create tok (1.19×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 44
- usd: $32.5461
- input: 84
- cache_create_5m: 0
- cache_create_1h: 76,189
- cache_read: 17,554,060
- output: 52,375

