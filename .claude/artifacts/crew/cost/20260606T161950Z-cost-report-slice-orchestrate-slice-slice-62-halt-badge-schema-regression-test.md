---
kind: cost-report
slice: SLICE-62
run_title: "orchestrate-slice: SLICE-62 halt-badge schema regression test"
usd: 24.3031
duration_ms: 300410
total_tokens: 15403788
cache_hit_pct: 99.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-06T16:19:50.831Z
---

# Cost Report: orchestrate-slice: SLICE-62 halt-badge schema regression test

- Created: 2026-06-06T16:19:50.831Z
- Run Title: orchestrate-slice: SLICE-62 halt-badge schema regression test
- Window Start: 2026-06-06T16:14:50.129Z
- Window End: 2026-06-06T16:19:50.539Z
- Duration: 5.0 min (300410 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 19
- Total Tokens: 15,403,788
- Cache Hit %: 99.9%
- Total USD: $24.3031
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-62
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 19
- cache_create_5m: 0
- cache_create_1h: 17,955
- cache_read: 15,376,488
- output: 9,326

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 19 msgs (100%), $24.3031 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 10
- Edit: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 14
- sum: 5,572
- p50: 300
- p90: 632
- max: 1,273

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 10 calls, 5,003B results, ~8,890 cache_create tok (1.78×)
- Write: 1 calls, 150B results, ~6,502 cache_create tok (43.35×)
- Edit: 2 calls, 320B results, ~2,348 cache_create tok (7.34×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 19
- usd: $24.3031
- input: 19
- cache_create_5m: 0
- cache_create_1h: 17,955
- cache_read: 15,376,488
- output: 9,326

