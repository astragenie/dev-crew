---
kind: cost-report
feature: FEAT-205
run_title: "FEAT205 SLICE138"
usd: 19.7296
duration_ms: 1226141
total_tokens: 11794000
cache_hit_pct: 99.7
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-02T01:44:39.711Z
---

# Cost Report: FEAT205 SLICE138

- Created: 2026-07-02T01:44:39.711Z
- Run Title: FEAT205 SLICE138
- Window Start: 2026-07-02T01:24:13.536Z
- Window End: 2026-07-02T01:44:39.677Z
- Duration: 20.4 min (1226141 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 33
- Total Tokens: 11,794,000
- Cache Hit %: 99.7%
- Total USD: $19.7296
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 33
- cache_create_5m: 0
- cache_create_1h: 36,348
- cache_read: 11,743,983
- output: 13,636

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 33 msgs (100%), $19.7296 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 19
- Read: 3
- Agent: 1

## Tool Result Sizes (bytes)

- count: 23
- sum: 19,304
- p50: 153
- p90: 1,443
- max: 12,068

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\Users\serge\AppData\Local\Temp\claude\C--work-mega-runner-plugin\7825bd92-7d4c-489c-b8c7-9fbe6c1f8c47\tasks\bnlw0cwv3.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 18 calls, 5,310B results, ~17,079 cache_create tok (3.22×)
- Agent: 1 calls, 278B results, ~4,648 cache_create tok (16.72×)
- Read: 3 calls, 1,648B results, ~3,345 cache_create tok (2.03×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 33
- usd: $19.7296
- input: 33
- cache_create_5m: 0
- cache_create_1h: 36,348
- cache_read: 11,743,983
- output: 13,636

