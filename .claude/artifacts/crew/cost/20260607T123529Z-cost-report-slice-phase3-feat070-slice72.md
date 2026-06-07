---
kind: cost-report
phase: "3"
feature: FEAT-070
run_title: "PHASE3 FEAT070 SLICE72"
usd: 48.6385
duration_ms: 8972025
total_tokens: 81441926
cache_hit_pct: 97.7
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T12:35:29.433Z
---

# Cost Report: PHASE3 FEAT070 SLICE72

- Created: 2026-06-07T12:35:29.433Z
- Run Title: PHASE3 FEAT070 SLICE72
- Window Start: 2026-06-07T10:05:57.158Z
- Window End: 2026-06-07T12:35:29.183Z
- Duration: 149.5 min (8972025 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 657
- Total Tokens: 81,441,926
- Cache Hit %: 97.7%
- Total USD: $48.6385
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 774
- cache_create_5m: 0
- cache_create_1h: 1,878,906
- cache_read: 79,058,460
- output: 503,786

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 652 msgs (99.24%), $41.0280 (84.35%)
- claude-opus-4-7 (priced as claude-opus-4): 5 msgs (0.76%), $7.6105 (15.65%)

## Conversation Shape

- user_msg_count: 6
- user_msg_avg_len: 11269
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 0
- subagent_dispatches: 17

## Tool Usage

- Read: 143
- Bash: 127 (4 failed)
- Edit: 111 (1 failed)
- Agent: 17
- Grep: 11
- Write: 3
- ToolSearch: 1
- Glob: 1

## Tool Result Sizes (bytes)

- count: 454
- sum: 484,953
- p50: 332
- p90: 2,857
- max: 14,067

## File Re-reads

- redundant_read_count: 90
- top paths:
  - 21× C:\work\mega\loop\src\scripts\loop.mts
  - 12× C:\work\mega\loop\src\scripts\lib\slice-linker\complete-slice.mts
  - 9× C:\work\mega\loop\src\scripts\lib\slice-linker\start-slice.mts
  - 7× C:\work\mega\loop\src\scripts\lib\slice-linker\crew-bridge.mts
  - 7× C:\work\mega\loop\src\scripts\lib\loop-installer-scaffold.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 131 calls, 187,347B results, ~735,934 cache_create tok (3.93×)
- Read: 173 calls, 259,659B results, ~588,340 cache_create tok (2.27×)
- Agent: 17 calls, 12,877B results, ~235,954 cache_create tok (18.32×)
- Write: 3 calls, 481B results, ~168,171 cache_create tok (349.63×)
- Edit: 116 calls, 18,559B results, ~132,586 cache_create tok (7.14×)
- Grep: 11 calls, 1,707B results, ~8,074 cache_create tok (4.73×)
- ToolSearch: 1 calls, 52B results, ~6,327 cache_create tok (121.67×)
- Glob: 1 calls, 2,243B results, ~967 cache_create tok (0.43×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 652
- usd: $41.0280
- input: 754
- cache_create_5m: 0
- cache_create_1h: 1,647,483
- cache_read: 78,909,486
- output: 497,865

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 5
- usd: $7.6105
- input: 20
- cache_create_5m: 0
- cache_create_1h: 231,423
- cache_read: 148,974
- output: 5,921

