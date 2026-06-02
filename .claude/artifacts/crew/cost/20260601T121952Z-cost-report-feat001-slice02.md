---
kind: cost-report
feature: FEAT-001
run_title: "FEAT001 SLICE02"
usd: 6.7592
duration_ms: 316959950
total_tokens: 1658248
cache_hit_pct: 90.3
source_project: C--work-mega-hero-crew-autonomous-loop
source_count: 1
created_at: 2026-06-01T12:19:52.513Z
---

# Cost Report: FEAT001 SLICE02

- Created: 2026-06-01T12:19:52.513Z
- Run Title: FEAT001 SLICE02
- Window Start: 2026-05-28T20:17:12.429Z
- Window End: 2026-06-01T12:19:52.379Z
- Duration: 5282.7 min (316959950 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 19
- Total Tokens: 1,658,248
- Cache Hit %: 90.3%
- Total USD: $6.7592
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 61
- cache_create_5m: 0
- cache_create_1h: 159,689
- cache_read: 1,490,009
- output: 8,489

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 14 msgs (73.68%), $6.5332 (96.66%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 5 msgs (26.32%), $0.2260 (3.34%)

## Conversation Shape

- user_msg_count: 6
- user_msg_avg_len: 61
- turns_before_first_tool: 1
- compaction_count: 3
- skill_invocations: 1
- subagent_dispatches: 0

## Tool Usage

- Bash: 8 (1 failed)
- Read: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 10
- sum: 68,009
- p50: 602
- p90: 58,835
- max: 58,835

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 1 calls, 58,835B results, ~51,560 cache_create tok (0.88×)
- Bash: 7 calls, 9,110B results, ~38,681 cache_create tok (4.25×)
- Skill: 1 calls, 36B results, ~3,342 cache_create tok (92.83×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 14
- usd: $6.5332
- input: 56
- cache_create_5m: 0
- cache_create_1h: 155,784
- cache_read: 861,451
- output: 7,556

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 5
- usd: $0.2260
- input: 5
- cache_create_5m: 0
- cache_create_1h: 3,905
- cache_read: 628,558
- output: 933

