---
kind: cost-report
feature: FEAT-011
run_title: "FEAT011 SLICE31"
usd: 3.5702
duration_ms: 494123
total_tokens: 10705293
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T20:43:45.899Z
---

# Cost Report: FEAT011 SLICE31

- Created: 2026-08-19T20:43:45.899Z
- Run Title: FEAT011 SLICE31
- Window Start: 2026-08-19T20:35:28.489Z
- Window End: 2026-08-19T20:43:42.612Z
- Duration: 8.2 min (494123 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 26
- Total Tokens: 10,705,293
- Cache Hit %: 99.7%
- Total USD: $3.5702
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 52
- cache_create_5m: 0
- cache_create_1h: 27,759
- cache_read: 10,663,860
- output: 13,622

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 26 msgs (100%), $3.5702 (100%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 4039
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 8
- Agent: 2
- TaskUpdate: 2
- SendMessage: 2
- Write: 2
- Edit: 1

## Tool Result Sizes (bytes)

- count: 17
- sum: 4,641
- p50: 230
- p90: 409
- max: 1,214

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 2 calls, 779B results, ~15,827 cache_create tok (20.32×)
- Bash: 7 calls, 2,466B results, ~3,906 cache_create tok (1.58×)
- Agent: 2 calls, 626B results, ~3,630 cache_create tok (5.8×)
- Write: 2 calls, 460B results, ~1,751 cache_create tok (3.81×)
- TaskUpdate: 2 calls, 57B results, ~1,289 cache_create tok (22.61×)
- Edit: 1 calls, 170B results, ~417 cache_create tok (2.45×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 26
- usd: $3.5702
- input: 52
- cache_create_5m: 0
- cache_create_1h: 27,759
- cache_read: 10,663,860
- output: 13,622

