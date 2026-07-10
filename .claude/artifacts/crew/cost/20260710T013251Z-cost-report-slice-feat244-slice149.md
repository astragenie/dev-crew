---
kind: cost-report
feature: FEAT-244
run_title: "FEAT244 SLICE149"
usd: 10.3036
duration_ms: 2564715
total_tokens: 18391182
cache_hit_pct: 99.2
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-10T01:32:51.045Z
---

# Cost Report: FEAT244 SLICE149

- Created: 2026-07-10T01:32:51.045Z
- Run Title: FEAT244 SLICE149
- Window Start: 2026-07-10T00:50:04.869Z
- Window End: 2026-07-10T01:32:49.584Z
- Duration: 42.7 min (2564715 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 92
- Total Tokens: 18,391,182
- Cache Hit %: 99.2%
- Total USD: $10.3036
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 12,461
- cache_create_5m: 62,247
- cache_create_1h: 78,272
- cache_read: 18,169,099
- output: 69,103

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 74 msgs (80.43%), $6.4588 (62.69%)
- claude-opus-4-7 (priced as claude-opus-4): 18 msgs (19.57%), $3.8448 (37.32%)

## Conversation Shape

- user_msg_count: 7
- user_msg_avg_len: 4726
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Bash: 20 (1 failed)
- Read: 9 (1 failed)
- TaskUpdate: 4
- Agent: 3
- TaskCreate: 3
- SendMessage: 2
- Edit: 2 (1 failed)
- Grep: 2
- StructuredOutput: 1

## Tool Result Sizes (bytes)

- count: 46
- sum: 52,010
- p50: 276
- p90: 2,615
- max: 13,873

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 19 calls, 9,783B results, ~64,922 cache_create tok (6.64×)
- Read: 9 calls, 38,433B results, ~28,301 cache_create tok (0.74×)
- TaskUpdate: 4 calls, 112B results, ~15,697 cache_create tok (140.15×)
- Grep: 2 calls, 241B results, ~9,366 cache_create tok (38.86×)
- TaskCreate: 3 calls, 274B results, ~7,935 cache_create tok (28.96×)
- SendMessage: 2 calls, 1,565B results, ~5,966 cache_create tok (3.81×)
- Agent: 3 calls, 947B results, ~5,497 cache_create tok (5.8×)
- Edit: 2 calls, 281B results, ~1,422 cache_create tok (5.06×)
- StructuredOutput: 1 calls, 39B results, ~0 cache_create tok (0×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 74
- usd: $6.4588
- input: 12,433
- cache_create_5m: 0
- cache_create_1h: 78,272
- cache_read: 17,232,253
- output: 52,143

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 18
- usd: $3.8448
- input: 28
- cache_create_5m: 62,247
- cache_create_1h: 0
- cache_read: 936,846
- output: 16,960

