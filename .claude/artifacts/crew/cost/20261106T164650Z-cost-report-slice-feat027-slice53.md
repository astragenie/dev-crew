---
kind: cost-report
feature: FEAT-027
run_title: "FEAT027 SLICE53"
usd: 15.9924
duration_ms: 41238890
total_tokens: 19229187
cache_hit_pct: 98.1
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
run_id: "2026-11-06T05:19:31.430Z_2026-11-06T16:46:50.320Z"
created_at: 2026-11-06T16:46:50.543Z
---

# Cost Report: FEAT027 SLICE53

- Created: 2026-11-06T16:46:50.543Z
- Run Title: FEAT027 SLICE53
- Window Start: 2026-11-06T05:19:31.430Z
- Window End: 2026-11-06T16:46:50.320Z
- Duration: 687.3 min (41238890 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 83
- Total Tokens: 19,229,187
- Cache Hit %: 98.1%
- Total USD: $15.9924
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 1,570
- cache_create_5m: 0
- cache_create_1h: 364,514
- cache_read: 18,752,227
- output: 110,876

## Model Mix

- claude-fable-5-1 (priced as claude-fable-5-1): 68 msgs (81.93%), $13.2762 (83.02%)
- claude-opus-5 (priced as claude-opus-5): 15 msgs (18.07%), $2.7162 (16.98%)

## Conversation Shape

- user_msg_count: 14
- user_msg_avg_len: 2021
- turns_before_first_tool: 2
- compaction_count: 3
- skill_invocations: 2
- subagent_dispatches: 9

## Tool Usage

- Bash: 21
- Agent: 9
- SendMessage: 5
- Skill: 2

## Tool Result Sizes (bytes)

- count: 37
- sum: 85,483
- p50: 1,112
- p90: 6,237
- max: 17,957

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 20 calls, 78,955B results, ~133,765 cache_create tok (1.69×)
- Agent: 9 calls, 5,214B results, ~51,693 cache_create tok (9.91×)
- Skill: 2 calls, 68B results, ~12,270 cache_create tok (180.44×)
- SendMessage: 5 calls, 1,070B results, ~10,063 cache_create tok (9.4×)


## By Model (token detail)

### claude-fable-5-1 (priced as claude-fable-5-1)
- messages: 68
- usd: $13.2762
- input: 1,540
- cache_create_5m: 0
- cache_create_1h: 340,729
- cache_read: 8,636,545
- output: 85,742

### claude-opus-5 (priced as claude-opus-5)
- messages: 15
- usd: $2.7162
- input: 30
- cache_create_5m: 0
- cache_create_1h: 23,785
- cache_read: 10,115,682
- output: 25,134

