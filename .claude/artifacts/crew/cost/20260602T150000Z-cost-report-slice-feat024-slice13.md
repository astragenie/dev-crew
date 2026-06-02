---
kind: cost-report
feature: FEAT-024
run_title: "FEAT024 SLICE13"
usd: 5.961
duration_ms: 423761
total_tokens: 3335101
cache_hit_pct: 99.5
source_project: C--work-mega-hero-crew-autonomous-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-02T15:00:00.236Z
---

# Cost Report: FEAT024 SLICE13

- Created: 2026-06-02T15:00:00.236Z
- Run Title: FEAT024 SLICE13
- Window Start: 2026-06-02T14:52:56.316Z
- Window End: 2026-06-02T15:00:00.077Z
- Duration: 7.1 min (423761 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 9
- Total Tokens: 3,335,101
- Cache Hit %: 99.5%
- Total USD: $5.9610
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 24
- cache_create_5m: 0
- cache_create_1h: 18,070
- cache_read: 3,310,979
- output: 6,028

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 9 msgs (100%), $5.9610 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 3
- Agent: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 6
- sum: 4,415
- p50: 834
- p90: 1,825
- max: 1,825

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 1,825B results, ~9,414 cache_create tok (5.16×)
- Read: 1 calls, 1,220B results, ~4,707 cache_create tok (3.86×)
- Bash: 3 calls, 1,016B results, ~3,351 cache_create tok (3.3×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 9
- usd: $5.9610
- input: 24
- cache_create_5m: 0
- cache_create_1h: 18,070
- cache_read: 3,310,979
- output: 6,028

