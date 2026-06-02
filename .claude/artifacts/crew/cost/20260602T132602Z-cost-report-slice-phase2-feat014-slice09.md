---
kind: cost-report
phase: "2"
feature: FEAT-014
run_title: "PHASE2 FEAT014 SLICE09"
usd: 4.2488
duration_ms: 532956
total_tokens: 2293798
cache_hit_pct: 99.4
source_project: C--work-mega-hero-crew-autonomous-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-02T13:26:02.540Z
---

# Cost Report: PHASE2 FEAT014 SLICE09

- Created: 2026-06-02T13:26:02.540Z
- Run Title: PHASE2 FEAT014 SLICE09
- Window Start: 2026-06-02T13:17:09.424Z
- Window End: 2026-06-02T13:26:02.380Z
- Duration: 8.9 min (532956 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 9
- Total Tokens: 2,293,798
- Cache Hit %: 99.4%
- Total USD: $4.2488
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 19
- cache_create_5m: 0
- cache_create_1h: 13,162
- cache_read: 2,274,730
- output: 5,887

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 9 msgs (100%), $4.2488 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 8
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 2
- TaskUpdate: 1
- Agent: 1

## Tool Result Sizes (bytes)

- count: 5
- sum: 8,405
- p50: 1,323
- p90: 5,170
- max: 5,170

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 1,323B results, ~3,920 cache_create tok (2.96×)
- TaskUpdate: 1 calls, 22B results, ~2,238 cache_create tok (101.73×)
- Bash: 2 calls, 1,890B results, ~1,054 cache_create tok (0.56×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 9
- usd: $4.2488
- input: 19
- cache_create_5m: 0
- cache_create_1h: 13,162
- cache_read: 2,274,730
- output: 5,887

