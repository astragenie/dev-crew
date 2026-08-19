---
kind: cost-report
feature: FEAT-004
run_title: "FEAT004 SLICE18"
usd: 24.3534
duration_ms: 11770508
total_tokens: 71788375
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T06:24:09.903Z
---

# Cost Report: FEAT004 SLICE18

- Created: 2026-08-19T06:24:09.903Z
- Run Title: FEAT004 SLICE18
- Window Start: 2026-08-19T03:07:55.529Z
- Window End: 2026-08-19T06:24:06.037Z
- Duration: 196.2 min (11770508 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 114
- Total Tokens: 71,788,375
- Cache Hit %: 99.7%
- Total USD: $24.3534
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 228
- cache_create_5m: 0
- cache_create_1h: 191,367
- cache_read: 71,479,399
- output: 117,381

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 114 msgs (100%), $24.3534 (100%)

## Conversation Shape

- user_msg_count: 31
- user_msg_avg_len: 2184
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 9

## Tool Usage

- Bash: 13
- Agent: 9
- SendMessage: 4
- Workflow: 4

## Tool Result Sizes (bytes)

- count: 30
- sum: 15,816
- p50: 323
- p90: 1,243
- max: 2,642

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Workflow: 4 calls, 4,967B results, ~69,425 cache_create tok (13.98×)
- Bash: 12 calls, 5,915B results, ~52,173 cache_create tok (8.82×)
- Agent: 9 calls, 2,853B results, ~51,542 cache_create tok (18.07×)
- SendMessage: 4 calls, 1,504B results, ~16,100 cache_create tok (10.7×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 114
- usd: $24.3534
- input: 228
- cache_create_5m: 0
- cache_create_1h: 191,367
- cache_read: 71,479,399
- output: 117,381

