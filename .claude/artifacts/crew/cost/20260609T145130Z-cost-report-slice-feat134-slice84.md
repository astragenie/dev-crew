---
kind: cost-report
feature: FEAT-134
run_title: "FEAT134 SLICE84"
usd: 13.0008
duration_ms: 2064588
total_tokens: 23525771
cache_hit_pct: 98.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-09T14:51:30.342Z
---

# Cost Report: FEAT134 SLICE84

- Created: 2026-06-09T14:51:30.342Z
- Run Title: FEAT134 SLICE84
- Window Start: 2026-06-09T14:17:05.543Z
- Window End: 2026-06-09T14:51:30.131Z
- Duration: 34.4 min (2064588 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 170
- Total Tokens: 23,525,771
- Cache Hit %: 98.9%
- Total USD: $13.0008
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 1,327
- cache_create_5m: 99,399
- cache_create_1h: 146,475
- cache_read: 23,190,657
- output: 87,913

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 157 msgs (92.35%), $8.6641 (66.64%)
- claude-opus-4-7 (priced as claude-opus-4): 13 msgs (7.65%), $4.3367 (33.36%)

## Conversation Shape

- user_msg_count: 6
- user_msg_avg_len: 5156
- turns_before_first_tool: 1
- compaction_count: 2
- skill_invocations: 2
- subagent_dispatches: 3

## Tool Usage

- PowerShell: 36 (7 failed)
- Bash: 25 (1 failed)
- Read: 8 (1 failed)
- Agent: 3
- Grep: 2
- Skill: 2
- StructuredOutput: 1

## Tool Result Sizes (bytes)

- count: 77
- sum: 87,499
- p50: 191
- p90: 4,864
- max: 13,356

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 24 calls, 22,521B results, ~45,891 cache_create tok (2.04×)
- PowerShell: 36 calls, 9,481B results, ~44,840 cache_create tok (4.73×)
- Read: 8 calls, 42,148B results, ~39,193 cache_create tok (0.93×)
- Agent: 3 calls, 2,041B results, ~19,822 cache_create tok (9.71×)
- StructuredOutput: 1 calls, 39B results, ~15,468 cache_create tok (396.62×)
- Skill: 2 calls, 77B results, ~4,680 cache_create tok (60.78×)
- Grep: 2 calls, 294B results, ~1,012 cache_create tok (3.44×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 13
- usd: $4.3367
- input: 23
- cache_create_5m: 99,399
- cache_create_1h: 0
- cache_read: 527,520
- output: 22,418

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 157
- usd: $8.6641
- input: 1,304
- cache_create_5m: 0
- cache_create_1h: 146,475
- cache_read: 22,663,137
- output: 65,495

