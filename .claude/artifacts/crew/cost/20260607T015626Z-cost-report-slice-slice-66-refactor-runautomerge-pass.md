---
kind: cost-report
slice: SLICE-66
run_title: "SLICE-66 refactor runAutoMerge — PASS"
usd: 14.9278
duration_ms: 169467
total_tokens: 8939806
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T01:56:26.771Z
---

# Cost Report: SLICE-66 refactor runAutoMerge — PASS

- Created: 2026-06-07T01:56:26.771Z
- Run Title: SLICE-66 refactor runAutoMerge — PASS
- Window Start: 2026-06-07T01:53:36.973Z
- Window End: 2026-06-07T01:56:26.440Z
- Duration: 2.8 min (169467 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 22
- Total Tokens: 8,939,806
- Cache Hit %: 99.7%
- Total USD: $14.9278
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-66
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 22
- cache_create_5m: 0
- cache_create_1h: 26,771
- cache_read: 8,902,743
- output: 10,270

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 22 msgs (100%), $14.9278 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 8
- Read: 2
- Edit: 2

## Tool Result Sizes (bytes)

- count: 13
- sum: 18,983
- p50: 242
- p90: 4,494
- max: 8,787

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\auto-merge.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 2 calls, 13,281B results, ~13,316 cache_create tok (1×)
- Bash: 8 calls, 4,910B results, ~10,467 cache_create tok (2.13×)
- Edit: 2 calls, 370B results, ~2,182 cache_create tok (5.9×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 22
- usd: $14.9278
- input: 22
- cache_create_5m: 0
- cache_create_1h: 26,771
- cache_read: 8,902,743
- output: 10,270

