---
kind: cost-report
feature: FEAT-026
run_title: "FEAT026 SLICE12"
usd: 15.781
duration_ms: 687497
total_tokens: 8878140
cache_hit_pct: 99.5
source_project: C--work-mega-hero-crew-autonomous-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-02T14:50:31.065Z
---

# Cost Report: FEAT026 SLICE12

- Created: 2026-06-02T14:50:31.065Z
- Run Title: FEAT026 SLICE12
- Window Start: 2026-06-02T14:39:03.414Z
- Window End: 2026-06-02T14:50:30.911Z
- Duration: 11.5 min (687497 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 26
- Total Tokens: 8,878,140
- Cache Hit %: 99.5%
- Total USD: $15.7810
- Source Project: C--work-mega-hero-crew-autonomous-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 41
- cache_create_5m: 0
- cache_create_1h: 46,643
- cache_read: 8,816,029
- output: 15,427

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 26 msgs (100%), $15.7810 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Read: 6
- Bash: 4
- Edit: 4
- Agent: 1
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 17
- sum: 17,095
- p50: 371
- p90: 3,200
- max: 4,899

## File Re-reads

- redundant_read_count: 5
- top paths:
  - 6× C:\work\mega\hero-crew-autonomous-loop\src\scripts\lib\slice-linker\complete-slice.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Edit: 4 calls, 768B results, ~14,756 cache_create tok (19.21×)
- Read: 6 calls, 13,616B results, ~13,663 cache_create tok (1×)
- Bash: 4 calls, 1,950B results, ~8,554 cache_create tok (4.39×)
- Agent: 1 calls, 375B results, ~7,918 cache_create tok (21.11×)
- ToolSearch: 1 calls, 32B results, ~1,400 cache_create tok (43.75×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 26
- usd: $15.7810
- input: 41
- cache_create_5m: 0
- cache_create_1h: 46,643
- cache_read: 8,816,029
- output: 15,427

