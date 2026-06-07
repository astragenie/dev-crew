---
kind: cost-report
slice: SLICE-68
run_title: "SLICE-68 upstream-request preflight chained-cd MSYS — PASS"
usd: 23.5887
duration_ms: 130015
total_tokens: 14425086
cache_hit_pct: 99.8
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-07T07:41:27.973Z
---

# Cost Report: SLICE-68 upstream-request preflight chained-cd MSYS — PASS

- Created: 2026-06-07T07:41:27.973Z
- Run Title: SLICE-68 upstream-request preflight chained-cd MSYS — PASS
- Window Start: 2026-06-07T07:39:15.003Z
- Window End: 2026-06-07T07:41:25.018Z
- Duration: 2.2 min (130015 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 23
- Total Tokens: 14,425,086
- Cache Hit %: 99.8%
- Total USD: $23.5887
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 17 msgs, $18.3412
- C--work-mega-loop: 6 msgs, $5.2475

## Outcome Linkage

- Slice: SLICE-68
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 23
- cache_create_5m: 0
- cache_create_1h: 21,995
- cache_read: 14,385,056
- output: 18,012

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 23 msgs (100%), $23.5887 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 9
- Read: 4
- Write: 3
- Glob: 1
- Edit: 1

## Tool Result Sizes (bytes)

- count: 19
- sum: 8,141
- p50: 192
- p90: 1,679
- max: 1,997

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 9 calls, 2,848B results, ~12,780 cache_create tok (4.49×)
- Write: 3 calls, 592B results, ~5,342 cache_create tok (9.02×)
- Read: 4 calls, 4,181B results, ~2,418 cache_create tok (0.58×)
- Edit: 1 calls, 182B results, ~1,032 cache_create tok (5.67×)
- Glob: 1 calls, 64B results, ~128 cache_create tok (2×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 23
- usd: $23.5887
- input: 23
- cache_create_5m: 0
- cache_create_1h: 21,995
- cache_read: 14,385,056
- output: 18,012

