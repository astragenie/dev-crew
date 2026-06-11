---
kind: cost-report
feature: FEAT-187
run_title: "FEAT187 SLICE96"
usd: 31.4775
duration_ms: 1644168
total_tokens: 9783963
cache_hit_pct: 94.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-11T16:39:16.995Z
---

# Cost Report: FEAT187 SLICE96

- Created: 2026-06-11T16:39:16.995Z
- Run Title: FEAT187 SLICE96
- Window Start: 2026-06-11T16:11:52.454Z
- Window End: 2026-06-11T16:39:16.622Z
- Duration: 27.4 min (1644168 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 57
- Total Tokens: 9,783,963
- Cache Hit %: 94.9%
- Total USD: $31.4775
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 925
- cache_create_5m: 0
- cache_create_1h: 499,821
- cache_read: 9,248,603
- output: 34,614

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 57 msgs (100%), $31.4775 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 14
- Edit: 7 (1 failed)
- Read: 6
- Agent: 4
- TaskUpdate: 2
- ToolSearch: 1
- TaskList: 1

## Tool Result Sizes (bytes)

- count: 36
- sum: 21,637
- p50: 256
- p90: 1,622
- max: 2,589

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\loop\src\tests\artifact-naming.test.mts
  - 2× C:\work\mega\loop\docs\conventions\report-filenames-writer-audit.md

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- ToolSearch: 1 calls, 101B results, ~293,952 cache_create tok (2910.42×)
- TaskList: 1 calls, 190B results, ~146,976 cache_create tok (773.56×)
- Bash: 14 calls, 6,572B results, ~20,806 cache_create tok (3.17×)
- Agent: 4 calls, 4,387B results, ~15,504 cache_create tok (3.53×)
- Read: 6 calls, 8,987B results, ~7,827 cache_create tok (0.87×)
- Edit: 7 calls, 1,077B results, ~6,019 cache_create tok (5.59×)
- TaskUpdate: 2 calls, 44B results, ~631 cache_create tok (14.34×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 57
- usd: $31.4775
- input: 925
- cache_create_5m: 0
- cache_create_1h: 499,821
- cache_read: 9,248,603
- output: 34,614

