---
kind: cost-report
feature: FEAT-167
run_title: "FEAT167 SLICE101"
usd: 28.403
duration_ms: 434159
total_tokens: 14355677
cache_hit_pct: 99.3
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T08:14:17.635Z
---

# Cost Report: FEAT167 SLICE101

- Created: 2026-06-12T08:14:17.635Z
- Run Title: FEAT167 SLICE101
- Window Start: 2026-06-12T08:07:03.079Z
- Window End: 2026-06-12T08:14:17.238Z
- Duration: 7.2 min (434159 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 48
- Total Tokens: 14,355,677
- Cache Hit %: 99.3%
- Total USD: $28.4030
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 48
- cache_create_5m: 0
- cache_create_1h: 101,054
- cache_read: 14,200,305
- output: 54,270

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 48 msgs (100%), $28.4030 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 16
- Edit: 9
- Read: 6
- Write: 3

## Tool Result Sizes (bytes)

- count: 35
- sum: 32,743
- p50: 161
- p90: 3,245
- max: 9,554

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\cost-regression.mts
  - 2× C:\work\mega\loop\src\scripts\lib\stop-conditions.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 16 calls, 5,486B results, ~46,190 cache_create tok (8.42×)
- Edit: 9 calls, 1,453B results, ~21,758 cache_create tok (14.97×)
- Read: 6 calls, 15,777B results, ~11,050 cache_create tok (0.7×)
- Write: 3 calls, 473B results, ~7,236 cache_create tok (15.3×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 48
- usd: $28.4030
- input: 48
- cache_create_5m: 0
- cache_create_1h: 101,054
- cache_read: 14,200,305
- output: 54,270

