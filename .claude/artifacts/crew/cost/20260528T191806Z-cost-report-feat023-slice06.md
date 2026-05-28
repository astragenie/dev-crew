---
kind: cost-report
feature: FEAT-023
run_title: "FEAT023 SLICE06"
usd: 0.6755
duration_ms: 483338
total_tokens: 1581555
cache_hit_pct: 99.0
source_project: C--work-mega-hero-crew-autonomous-loop
source_count: 1
created_at: 2026-05-28T19:18:06.969Z
---

# Cost Report: FEAT023 SLICE06

- Created: 2026-05-28T19:18:06.969Z
- Run Title: FEAT023 SLICE06
- Window Start: 2026-05-28T19:10:03.500Z
- Window End: 2026-05-28T19:18:06.838Z
- Duration: 8.1 min (483338 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 13
- Total Tokens: 1,581,555
- Cache Hit %: 99.0%
- Total USD: $0.6755
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 13
- cache_create_5m: 0
- cache_create_1h: 15,392
- cache_read: 1,558,444
- output: 7,706

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 13 msgs (100%), $0.6755 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 5 (1 failed)
- Agent: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 8
- sum: 11,121
- p50: 955
- p90: 5,150
- max: 5,150

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 1,408B results, ~6,708 cache_create tok (4.76×)
- Bash: 5 calls, 3,057B results, ~2,666 cache_create tok (0.87×)
- Read: 1 calls, 1,506B results, ~789 cache_create tok (0.52×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 13
- usd: $0.6755
- input: 13
- cache_create_5m: 0
- cache_create_1h: 15,392
- cache_read: 1,558,444
- output: 7,706

