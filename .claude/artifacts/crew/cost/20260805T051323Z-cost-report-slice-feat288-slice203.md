---
kind: cost-report
feature: FEAT-288
run_title: "FEAT288 SLICE203"
usd: 2.754
duration_ms: 241990
total_tokens: 6935751
cache_hit_pct: 99.4
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-05T05:13:23.835Z
---

# Cost Report: FEAT288 SLICE203

- Created: 2026-08-05T05:13:23.835Z
- Run Title: FEAT288 SLICE203
- Window Start: 2026-08-05T05:09:20.933Z
- Window End: 2026-08-05T05:13:22.923Z
- Duration: 4.0 min (241990 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 27
- Total Tokens: 6,935,751
- Cache Hit %: 99.4%
- Total USD: $2.7540
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 54
- cache_create_5m: 0
- cache_create_1h: 41,572
- cache_read: 6,864,456
- output: 29,669

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 27 msgs (100%), $2.7540 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 7
- Read: 3
- Edit: 3
- Agent: 1

## Tool Result Sizes (bytes)

- count: 14
- sum: 6,984
- p50: 305
- p90: 1,554
- max: 1,608

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\runner-plugin\src\scripts\lib\slice-linker\feature-lifecycle.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 6 calls, 2,171B results, ~15,344 cache_create tok (7.07×)
- Edit: 3 calls, 675B results, ~12,810 cache_create tok (18.98×)
- Agent: 1 calls, 305B results, ~6,315 cache_create tok (20.7×)
- Read: 3 calls, 3,602B results, ~6,190 cache_create tok (1.72×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 27
- usd: $2.7540
- input: 54
- cache_create_5m: 0
- cache_create_1h: 41,572
- cache_read: 6,864,456
- output: 29,669

