---
kind: cost-report
phase: "2"
feature: FEAT-007
run_title: "PHASE2 FEAT007 SLICE39"
usd: 17.0443
duration_ms: 425299
total_tokens: 9966897
cache_hit_pct: 97.6
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-04T22:21:19.590Z
---

# Cost Report: PHASE2 FEAT007 SLICE39

- Created: 2026-06-04T22:21:19.591Z
- Run Title: PHASE2 FEAT007 SLICE39
- Window Start: 2026-06-04T22:14:08.703Z
- Window End: 2026-06-04T22:21:14.002Z
- Duration: 7.1 min (425299 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 83
- Total Tokens: 9,966,897
- Cache Hit %: 97.6%
- Total USD: $17.0443
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 129
- cache_create_5m: 0
- cache_create_1h: 233,773
- cache_read: 9,697,616
- output: 35,379

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 50 msgs (60.24%), $15.2516 (89.48%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 33 msgs (39.76%), $1.7927 (10.52%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 37
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 15
- TaskUpdate: 10
- Read: 7
- Edit: 7
- TaskCreate: 5
- Grep: 4
- ToolSearch: 1
- WebFetch: 1
- Agent: 1

## Tool Result Sizes (bytes)

- count: 51
- sum: 47,508
- p50: 150
- p90: 2,116
- max: 9,240

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\src\tests\loop-installer.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- ToolSearch: 1 calls, 152B results, ~158,976 cache_create tok (1045.89×)
- Read: 7 calls, 25,069B results, ~23,920 cache_create tok (0.95×)
- Edit: 7 calls, 1,070B results, ~15,250 cache_create tok (14.25×)
- TaskUpdate: 10 calls, 220B results, ~13,602 cache_create tok (61.83×)
- Bash: 14 calls, 3,538B results, ~7,592 cache_create tok (2.15×)
- Agent: 1 calls, 4,304B results, ~6,144 cache_create tok (1.43×)
- Grep: 4 calls, 3,429B results, ~3,148 cache_create tok (0.92×)
- WebFetch: 1 calls, 1,110B results, ~1,344 cache_create tok (1.21×)
- TaskCreate: 5 calls, 404B results, ~1,093 cache_create tok (2.71×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 50
- usd: $15.2516
- input: 90
- cache_create_5m: 0
- cache_create_1h: 193,803
- cache_read: 5,300,375
- output: 19,808

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 33
- usd: $1.7927
- input: 39
- cache_create_5m: 0
- cache_create_1h: 39,970
- cache_read: 4,397,241
- output: 15,571

