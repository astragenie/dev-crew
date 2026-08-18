---
kind: cost-report
feature: FEAT-002
run_title: "FEAT002 SLICE05"
usd: 3.0539
duration_ms: 1552323
total_tokens: 7655042
cache_hit_pct: 99.3
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-18T22:51:16.117Z
---

# Cost Report: FEAT002 SLICE05

- Created: 2026-08-18T22:51:16.117Z
- Run Title: FEAT002 SLICE05
- Window Start: 2026-08-18T22:25:18.605Z
- Window End: 2026-08-18T22:51:10.928Z
- Duration: 25.9 min (1552323 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 20
- Total Tokens: 7,655,042
- Cache Hit %: 99.3%
- Total USD: $3.0539
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 40
- cache_create_5m: 0
- cache_create_1h: 57,058
- cache_read: 7,568,552
- output: 29,392

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 20 msgs (100%), $3.0539 (100%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 3090
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Agent: 2
- Bash: 2
- Workflow: 1

## Tool Result Sizes (bytes)

- count: 5
- sum: 3,069
- p50: 358
- p90: 1,263
- max: 1,263

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 2 calls, 1,298B results, ~27,222 cache_create tok (20.97×)
- Workflow: 1 calls, 1,263B results, ~22,264 cache_create tok (17.63×)
- Bash: 1 calls, 150B results, ~1,605 cache_create tok (10.7×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 20
- usd: $3.0539
- input: 40
- cache_create_5m: 0
- cache_create_1h: 57,058
- cache_read: 7,568,552
- output: 29,392

