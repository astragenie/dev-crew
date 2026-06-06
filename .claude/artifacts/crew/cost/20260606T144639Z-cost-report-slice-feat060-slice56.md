---
kind: cost-report
feature: FEAT-060
run_title: "FEAT060 SLICE56"
usd: 84.4912
duration_ms: 2445626
total_tokens: 50764761
cache_hit_pct: 99.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-06T14:46:39.801Z
---

# Cost Report: FEAT060 SLICE56

- Created: 2026-06-06T14:46:39.801Z
- Run Title: FEAT060 SLICE56
- Window Start: 2026-06-06T14:05:40.229Z
- Window End: 2026-06-06T14:46:25.855Z
- Duration: 40.8 min (2445626 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 93
- Total Tokens: 50,764,761
- Cache Hit %: 99.7%
- Total USD: $84.4912
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 113
- cache_create_5m: 0
- cache_create_1h: 129,321
- cache_read: 50,571,968
- output: 63,359

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 93 msgs (100%), $84.4912 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 6

## Tool Usage

- Bash: 29
- Edit: 15 (1 failed)
- Read: 14
- Agent: 6

## Tool Result Sizes (bytes)

- count: 64
- sum: 46,699
- p50: 337
- p90: 1,723
- max: 5,590

## File Re-reads

- redundant_read_count: 10
- top paths:
  - 6× C:\work\mega\loop\src\tests\worktree-manager.test.mts
  - 4× C:\work\mega\loop\src\scripts\lib\worktree-manager.mts
  - 3× C:\work\mega\loop\src\scripts\lib\slice-linker\start-slice.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 28 calls, 13,861B results, ~51,297 cache_create tok (3.7×)
- Agent: 6 calls, 11,637B results, ~37,248 cache_create tok (3.2×)
- Edit: 15 calls, 2,456B results, ~25,830 cache_create tok (10.52×)
- Read: 14 calls, 18,226B results, ~13,851 cache_create tok (0.76×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 93
- usd: $84.4912
- input: 113
- cache_create_5m: 0
- cache_create_1h: 129,321
- cache_read: 50,571,968
- output: 63,359

