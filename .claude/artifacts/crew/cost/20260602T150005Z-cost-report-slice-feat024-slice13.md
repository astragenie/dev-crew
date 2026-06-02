---
kind: cost-report
feature: FEAT-024
run_title: "FEAT024 SLICE13"
usd: 8.5233
duration_ms: 429076
total_tokens: 4826109
cache_hit_pct: 99.6
source_project: C--work-mega-hero-crew-autonomous-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-02T15:00:05.550Z
---

# Cost Report: FEAT024 SLICE13

- Created: 2026-06-02T15:00:05.550Z
- Run Title: FEAT024 SLICE13
- Window Start: 2026-06-02T14:52:56.316Z
- Window End: 2026-06-02T15:00:05.392Z
- Duration: 7.2 min (429076 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 13
- Total Tokens: 4,826,109
- Cache Hit %: 99.6%
- Total USD: $8.5233
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 28
- cache_create_5m: 0
- cache_create_1h: 21,214
- cache_read: 4,795,627
- output: 9,240

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 13 msgs (100%), $8.5233 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 4
- TaskUpdate: 2
- Agent: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 9
- sum: 5,310
- p50: 354
- p90: 1,825
- max: 1,825

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 1,825B results, ~9,414 cache_create tok (5.16×)
- Bash: 4 calls, 1,865B results, ~4,923 cache_create tok (2.64×)
- Read: 1 calls, 1,220B results, ~4,707 cache_create tok (3.86×)
- TaskUpdate: 2 calls, 46B results, ~1,572 cache_create tok (34.17×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 13
- usd: $8.5233
- input: 28
- cache_create_5m: 0
- cache_create_1h: 21,214
- cache_read: 4,795,627
- output: 9,240

