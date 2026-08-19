---
kind: cost-report
feature: FEAT-003
run_title: "FEAT003 SLICE11"
usd: 3.1766
duration_ms: 2657068
total_tokens: 9108215
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T02:04:50.734Z
---

# Cost Report: FEAT003 SLICE11

- Created: 2026-08-19T02:04:50.734Z
- Run Title: FEAT003 SLICE11
- Window Start: 2026-08-19T01:20:30.629Z
- Window End: 2026-08-19T02:04:47.697Z
- Duration: 44.3 min (2657068 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 17
- Total Tokens: 9,108,215
- Cache Hit %: 99.6%
- Total USD: $3.1766
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 34
- cache_create_5m: 0
- cache_create_1h: 33,377
- cache_read: 9,057,540
- output: 17,264

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 17 msgs (100%), $3.1766 (100%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 2755
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Agent: 3
- Bash: 1

## Tool Result Sizes (bytes)

- count: 4
- sum: 7,691
- p50: 315
- p90: 6,756
- max: 6,756

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 3 calls, 935B results, ~23,726 cache_create tok (25.38×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 17
- usd: $3.1766
- input: 34
- cache_create_5m: 0
- cache_create_1h: 33,377
- cache_read: 9,057,540
- output: 17,264

