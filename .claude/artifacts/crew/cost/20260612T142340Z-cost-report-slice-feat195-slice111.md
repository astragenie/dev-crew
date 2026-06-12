---
kind: cost-report
feature: FEAT-195
run_title: "FEAT195 SLICE111"
usd: 11.4302
duration_ms: 214228
total_tokens: 6933352
cache_hit_pct: 99.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T14:23:40.051Z
---

# Cost Report: FEAT195 SLICE111

- Created: 2026-06-12T14:23:40.051Z
- Run Title: FEAT195 SLICE111
- Window Start: 2026-06-12T14:20:05.174Z
- Window End: 2026-06-12T14:23:39.402Z
- Duration: 3.6 min (214228 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 9
- Total Tokens: 6,933,352
- Cache Hit %: 99.8%
- Total USD: $11.4302
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 9
- cache_create_5m: 0
- cache_create_1h: 13,163
- cache_read: 6,911,270
- output: 8,910

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 9 msgs (100%), $11.4302 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Edit: 3
- Bash: 2
- Read: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 9
- sum: 3,565
- p50: 146
- p90: 1,513
- max: 1,513

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Edit: 3 calls, 408B results, ~4,893 cache_create tok (11.99×)
- Bash: 2 calls, 1,213B results, ~3,826 cache_create tok (3.15×)
- Read: 2 calls, 1,591B results, ~718 cache_create tok (0.45×)
- Write: 1 calls, 146B results, ~718 cache_create tok (4.92×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 9
- usd: $11.4302
- input: 9
- cache_create_5m: 0
- cache_create_1h: 13,163
- cache_read: 6,911,270
- output: 8,910

