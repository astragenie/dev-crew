---
kind: cost-report
feature: FEAT-177
run_title: "FEAT177 SLICE88"
usd: 136.4872
duration_ms: 7047341
total_tokens: 85177764
cache_hit_pct: 98.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-10T09:48:29.076Z
---

# Cost Report: FEAT177 SLICE88

- Created: 2026-06-10T09:48:29.076Z
- Run Title: FEAT177 SLICE88
- Window Start: 2026-06-10T07:51:01.475Z
- Window End: 2026-06-10T09:48:28.816Z
- Duration: 117.5 min (7047341 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 430
- Total Tokens: 85,177,764
- Cache Hit %: 98.8%
- Total USD: $136.4872
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 120,393
- cache_create_5m: 0
- cache_create_1h: 866,454
- cache_read: 83,844,113
- output: 346,804

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 265 msgs (61.63%), $125.7150 (92.11%)
- claude-fable-5 (priced as claude-sonnet-4): 165 msgs (38.37%), $10.7722 (7.89%)

## Conversation Shape

- user_msg_count: 21
- user_msg_avg_len: 116
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 7

## Tool Usage

- Bash: 54 (2 failed)
- Edit: 31 (5 failed)
- PowerShell: 31 (11 failed)
- Read: 30
- Grep: 21 (1 failed)
- Agent: 7
- Write: 7
- ToolSearch: 2
- Glob: 2
- TaskStop: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 187
- sum: 242,805
- p50: 253
- p90: 2,323
- max: 54,281

## File Re-reads

- redundant_read_count: 5
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\redundant-read-detector.mts
  - 2× C:\work\mega\loop\.claude\artifacts\loop\backlog\pending\FEAT-176.md
  - 2× C:\work\mega\loop\src\scripts\lib\memory-snapshot.mts
  - 2× C:\work\mega\loop\src\scripts\lib\slice-linker\feature-lifecycle.mts
  - 2× C:\work\mega\loop\src\scripts\lib\slice-plan.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- ToolSearch: 2 calls, 82B results, ~285,635 cache_create tok (3483.35×)
- Read: 30 calls, 111,573B results, ~149,732 cache_create tok (1.34×)
- Bash: 53 calls, 26,270B results, ~126,104 cache_create tok (4.8×)
- Agent: 7 calls, 41,855B results, ~99,020 cache_create tok (2.37×)
- Edit: 31 calls, 4,984B results, ~66,545 cache_create tok (13.35×)
- Grep: 21 calls, 36,353B results, ~54,995 cache_create tok (1.51×)
- PowerShell: 31 calls, 10,124B results, ~41,178 cache_create tok (4.07×)
- Write: 7 calls, 1,285B results, ~25,465 cache_create tok (19.82×)
- Skill: 1 calls, 33B results, ~2,451 cache_create tok (74.27×)
- Glob: 2 calls, 106B results, ~1,834 cache_create tok (17.3×)
- TaskStop: 1 calls, 925B results, ~847 cache_create tok (0.92×)


## By Model (token detail)

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 265
- usd: $125.7150
- input: 36,751
- cache_create_5m: 0
- cache_create_1h: 597,215
- cache_read: 60,503,011
- output: 219,903

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 165
- usd: $10.7722
- input: 83,642
- cache_create_5m: 0
- cache_create_1h: 269,239
- cache_read: 23,341,102
- output: 126,901

