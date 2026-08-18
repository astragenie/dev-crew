---
kind: cost-report
feature: FEAT-001
run_title: "FEAT001 SLICE02"
usd: 2.3664
duration_ms: 955515
total_tokens: 6414479
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-18T21:40:55.985Z
---

# Cost Report: FEAT001 SLICE02

- Created: 2026-08-18T21:40:55.985Z
- Run Title: FEAT001 SLICE02
- Window Start: 2026-08-18T21:24:56.660Z
- Window End: 2026-08-18T21:40:52.175Z
- Duration: 15.9 min (955515 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 20
- Total Tokens: 6,414,479
- Cache Hit %: 99.6%
- Total USD: $2.3664
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 40
- cache_create_5m: 0
- cache_create_1h: 27,527
- cache_read: 6,367,524
- output: 19,388

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 20 msgs (100%), $2.3664 (100%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 1957
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 3
- Agent: 2
- Edit: 1

## Tool Result Sizes (bytes)

- count: 6
- sum: 6,868
- p50: 315
- p90: 4,864
- max: 4,864

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 628B results, ~11,309 cache_create tok (18.01×)
- Bash: 2 calls, 1,220B results, ~7,917 cache_create tok (6.49×)
- Edit: 1 calls, 156B results, ~594 cache_create tok (3.81×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 20
- usd: $2.3664
- input: 40
- cache_create_5m: 0
- cache_create_1h: 27,527
- cache_read: 6,367,524
- output: 19,388

