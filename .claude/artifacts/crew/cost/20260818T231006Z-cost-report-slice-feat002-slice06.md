---
kind: cost-report
feature: FEAT-002
run_title: "FEAT002 SLICE06"
usd: 4.3058
duration_ms: 1098501
total_tokens: 11418726
cache_hit_pct: 99.4
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-18T23:10:06.462Z
---

# Cost Report: FEAT002 SLICE06

- Created: 2026-08-18T23:10:06.462Z
- Run Title: FEAT002 SLICE06
- Window Start: 2026-08-18T22:51:44.721Z
- Window End: 2026-08-18T23:10:03.222Z
- Duration: 18.3 min (1098501 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 28
- Total Tokens: 11,418,726
- Cache Hit %: 99.4%
- Total USD: $4.3058
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 56
- cache_create_5m: 0
- cache_create_1h: 64,601
- cache_read: 11,319,255
- output: 34,814

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 28 msgs (100%), $4.3058 (100%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 2543
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- TaskCreate: 6
- Bash: 3
- Workflow: 1
- ToolSearch: 1
- Agent: 1

## Tool Result Sizes (bytes)

- count: 12
- sum: 5,713
- p50: 112
- p90: 1,232
- max: 2,195

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- TaskCreate: 6 calls, 502B results, ~36,400 cache_create tok (72.51×)
- Bash: 2 calls, 2,515B results, ~12,174 cache_create tok (4.84×)
- Workflow: 1 calls, 1,232B results, ~9,291 cache_create tok (7.54×)
- Agent: 1 calls, 315B results, ~3,204 cache_create tok (10.17×)
- ToolSearch: 1 calls, 52B results, ~1,602 cache_create tok (30.81×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 28
- usd: $4.3058
- input: 56
- cache_create_5m: 0
- cache_create_1h: 64,601
- cache_read: 11,319,255
- output: 34,814

