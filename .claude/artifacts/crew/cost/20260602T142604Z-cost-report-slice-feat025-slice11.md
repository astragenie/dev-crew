---
kind: cost-report
feature: FEAT-025
run_title: "FEAT025 SLICE11"
usd: 4.6533
duration_ms: 417248
total_tokens: 2487809
cache_hit_pct: 99.4
source_project: C--work-mega-hero-crew-autonomous-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-02T14:26:04.288Z
---

# Cost Report: FEAT025 SLICE11

- Created: 2026-06-02T14:26:04.288Z
- Run Title: FEAT025 SLICE11
- Window Start: 2026-06-02T14:19:06.868Z
- Window End: 2026-06-02T14:26:04.116Z
- Duration: 7.0 min (417248 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 8
- Total Tokens: 2,487,809
- Cache Hit %: 99.4%
- Total USD: $4.6533
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 23
- cache_create_5m: 0
- cache_create_1h: 15,529
- cache_read: 2,465,744
- output: 6,513

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 8 msgs (100%), $4.6533 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 3
- Agent: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 6
- sum: 3,278
- p50: 753
- p90: 987
- max: 987

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 258B results, ~6,772 cache_create tok (26.25×)
- Bash: 3 calls, 1,679B results, ~4,780 cache_create tok (2.85×)
- Read: 1 calls, 987B results, ~3,386 cache_create tok (3.43×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 8
- usd: $4.6533
- input: 23
- cache_create_5m: 0
- cache_create_1h: 15,529
- cache_read: 2,465,744
- output: 6,513

