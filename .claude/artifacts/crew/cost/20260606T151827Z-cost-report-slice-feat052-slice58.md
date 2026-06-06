---
kind: cost-report
feature: FEAT-052
run_title: "FEAT052 SLICE58"
usd: 8.4385
duration_ms: 93609
total_tokens: 5279090
cache_hit_pct: 99.9
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-06T15:18:27.714Z
---

# Cost Report: FEAT052 SLICE58

- Created: 2026-06-06T15:18:27.714Z
- Run Title: FEAT052 SLICE58
- Window Start: 2026-06-06T15:16:44.396Z
- Window End: 2026-06-06T15:18:18.005Z
- Duration: 1.6 min (93609 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 8
- Total Tokens: 5,279,090
- Cache Hit %: 99.9%
- Total USD: $8.4385
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 8
- cache_create_5m: 0
- cache_create_1h: 5,480
- cache_read: 5,268,656
- output: 4,946

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 8 msgs (100%), $8.4385 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 4
- Write: 1
- Read: 1
- Edit: 1

## Tool Result Sizes (bytes)

- count: 7
- sum: 1,872
- p50: 137
- p90: 1,101
- max: 1,101

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Write: 1 calls, 151B results, ~2,737 cache_create tok (18.13×)
- Bash: 3 calls, 350B results, ~1,292 cache_create tok (3.69×)
- Read: 1 calls, 1,101B results, ~615 cache_create tok (0.56×)
- Edit: 1 calls, 133B results, ~603 cache_create tok (4.53×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 8
- usd: $8.4385
- input: 8
- cache_create_5m: 0
- cache_create_1h: 5,480
- cache_read: 5,268,656
- output: 4,946

