---
kind: cost-report
feature: FEAT-284
run_title: "FEAT284 SLICE192"
usd: 15.2915
duration_ms: 1661895
total_tokens: 42858450
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-08-05T06:00:55.768Z
---

# Cost Report: FEAT284 SLICE192

- Created: 2026-08-05T06:00:55.768Z
- Run Title: FEAT284 SLICE192
- Window Start: 2026-08-05T05:33:13.139Z
- Window End: 2026-08-05T06:00:55.034Z
- Duration: 27.7 min (1661895 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 119
- Total Tokens: 42,858,450
- Cache Hit %: 99.6%
- Total USD: $15.2915
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 238
- cache_create_5m: 0
- cache_create_1h: 167,658
- cache_read: 42,590,032
- output: 100,522

## Model Mix

- claude-opus-5 (priced as claude-sonnet-4): 119 msgs (100%), $15.2915 (100%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 3745
- turns_before_first_tool: 0
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 49
- Agent: 4
- Edit: 4
- Read: 3

## Tool Result Sizes (bytes)

- count: 60
- sum: 30,364
- p50: 305
- p90: 1,465
- max: 3,262

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 48 calls, 22,933B results, ~118,277 cache_create tok (5.16×)
- Agent: 4 calls, 1,226B results, ~39,841 cache_create tok (32.5×)
- Edit: 4 calls, 837B results, ~5,166 cache_create tok (6.17×)
- Read: 3 calls, 5,247B results, ~4,145 cache_create tok (0.79×)


## By Model (token detail)

### claude-opus-5 (priced as claude-sonnet-4)
- messages: 119
- usd: $15.2915
- input: 238
- cache_create_5m: 0
- cache_create_1h: 167,658
- cache_read: 42,590,032
- output: 100,522

