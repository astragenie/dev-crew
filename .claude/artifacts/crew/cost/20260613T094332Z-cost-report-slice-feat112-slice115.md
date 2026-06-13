---
kind: cost-report
feature: FEAT-112
run_title: "FEAT112 SLICE115"
usd: 142.7782
duration_ms: 65496397
total_tokens: 87168924
cache_hit_pct: 97.3
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-13T09:43:32.628Z
---

# Cost Report: FEAT112 SLICE115

- Created: 2026-06-13T09:43:32.629Z
- Run Title: FEAT112 SLICE115
- Window Start: 2026-06-12T15:31:55.716Z
- Window End: 2026-06-13T09:43:32.113Z
- Duration: 1091.6 min (65496397 ms)
- Sessions Scanned: 6
- Assistant Messages Counted: 634
- Total Tokens: 87,168,924
- Cache Hit %: 97.3%
- Total USD: $142.7782
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 62,158
- cache_create_5m: 0
- cache_create_1h: 2,257,800
- cache_read: 84,400,445
- output: 448,521

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 299 msgs (47.16%), $121.2462 (84.92%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 335 msgs (52.84%), $21.5320 (15.08%)

## Conversation Shape

- user_msg_count: 52
- user_msg_avg_len: 343
- turns_before_first_tool: 1
- compaction_count: 12
- skill_invocations: 2
- subagent_dispatches: 21

## Tool Usage

- Bash: 237 (21 failed)
- Read: 46
- Edit: 34 (2 failed)
- Agent: 21
- Write: 12
- Glob: 11
- PowerShell: 4
- Grep: 4
- Skill: 2
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 373
- sum: 421,320
- p50: 255
- p90: 3,388
- max: 17,260

## File Re-reads

- redundant_read_count: 16
- top paths:
  - 6× C:\work\mega\loop\agents\pm.md
  - 4× C:\work\mega\loop\commands\retriage.md
  - 3× C:\work\mega\loop\.claude\artifacts\loop\backlog\triaged\FEAT-020.md
  - 2× C:\work\mega\loop\.claude\artifacts\loop\dispatch\2026-06-13T08-42-52-174Z-23c48c\summary.md
  - 2× C:\work\mega\loop\src\scripts\loop.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 237 calls, 171,616B results, ~1,246,019 cache_create tok (7.26×)
- Read: 46 calls, 116,329B results, ~442,879 cache_create tok (3.81×)
- Agent: 21 calls, 74,093B results, ~175,783 cache_create tok (2.37×)
- Glob: 11 calls, 43,649B results, ~131,386 cache_create tok (3.01×)
- Write: 12 calls, 2,228B results, ~69,354 cache_create tok (31.13×)
- Edit: 34 calls, 5,446B results, ~56,413 cache_create tok (10.36×)
- Grep: 4 calls, 7,080B results, ~17,310 cache_create tok (2.44×)
- PowerShell: 4 calls, 560B results, ~10,575 cache_create tok (18.88×)
- Skill: 2 calls, 57B results, ~2,759 cache_create tok (48.4×)
- ToolSearch: 1 calls, 55B results, ~2,426 cache_create tok (44.11×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 299
- usd: $121.2462
- input: 699
- cache_create_5m: 0
- cache_create_1h: 1,067,099
- cache_read: 50,488,009
- output: 179,877

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 335
- usd: $21.5320
- input: 61,459
- cache_create_5m: 0
- cache_create_1h: 1,190,701
- cache_read: 33,912,436
- output: 268,644

