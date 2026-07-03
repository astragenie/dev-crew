---
kind: cost-report
feature: FEAT-176
run_title: "FEAT176 SLICE134"
usd: 3.646
duration_ms: 1092493
total_tokens: 9956720
cache_hit_pct: 99.4
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-02T18:34:22.813Z
---

# Cost Report: FEAT176 SLICE134

- Created: 2026-07-02T18:34:22.813Z
- Run Title: FEAT176 SLICE134
- Window Start: 2026-07-02T18:16:10.233Z
- Window End: 2026-07-02T18:34:22.726Z
- Duration: 18.2 min (1092493 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 20
- Total Tokens: 9,956,720
- Cache Hit %: 99.4%
- Total USD: $3.6460
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 11,566
- cache_create_5m: 0
- cache_create_1h: 49,220
- cache_read: 9,872,316
- output: 23,618

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 20 msgs (100%), $3.6460 (100%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 1772
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Agent: 3
- SendMessage: 2
- Bash: 1

## Tool Result Sizes (bytes)

- count: 7
- sum: 15,175
- p50: 980
- p90: 8,578
- max: 8,578

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 3 calls, 5,132B results, ~25,767 cache_create tok (5.02×)
- SendMessage: 2 calls, 852B results, ~7,042 cache_create tok (8.27×)
- Bash: 1 calls, 613B results, ~4,765 cache_create tok (7.77×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 20
- usd: $3.6460
- input: 11,566
- cache_create_5m: 0
- cache_create_1h: 49,220
- cache_read: 9,872,316
- output: 23,618

