---
kind: cost-report
phase: "2"
feature: FEAT-006
run_title: "PHASE2 FEAT006 SLICE10"
usd: 2.2599
duration_ms: 432089
total_tokens: 1184588
cache_hit_pct: 99.2
source_project: C--work-mega-hero-crew-autonomous-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-02T14:15:19.596Z
---

# Cost Report: PHASE2 FEAT006 SLICE10

- Created: 2026-06-02T14:15:19.596Z
- Run Title: PHASE2 FEAT006 SLICE10
- Window Start: 2026-06-02T14:08:07.343Z
- Window End: 2026-06-02T14:15:19.432Z
- Duration: 7.2 min (432089 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 4
- Total Tokens: 1,184,588
- Cache Hit %: 99.2%
- Total USD: $2.2599
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 14
- cache_create_5m: 0
- cache_create_1h: 9,839
- cache_read: 1,171,981
- output: 2,754

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 4 msgs (100%), $2.2599 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 2
- Agent: 1

## Tool Result Sizes (bytes)

- count: 4
- sum: 8,546
- p50: 1,059
- p90: 5,807
- max: 5,807

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 669B results, ~5,864 cache_create tok (8.77×)
- Bash: 2 calls, 2,070B results, ~908 cache_create tok (0.44×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 4
- usd: $2.2599
- input: 14
- cache_create_5m: 0
- cache_create_1h: 9,839
- cache_read: 1,171,981
- output: 2,754

