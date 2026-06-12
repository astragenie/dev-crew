---
kind: cost-report
feature: FEAT-190
run_title: "FEAT190 SLICE104"
usd: 17.2169
duration_ms: 262207
total_tokens: 8341127
cache_hit_pct: 99.4
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T11:15:24.341Z
---

# Cost Report: FEAT190 SLICE104

- Created: 2026-06-12T11:15:24.341Z
- Run Title: FEAT190 SLICE104
- Window Start: 2026-06-12T11:11:01.583Z
- Window End: 2026-06-12T11:15:23.790Z
- Duration: 4.4 min (262207 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 19
- Total Tokens: 8,341,127
- Cache Hit %: 99.4%
- Total USD: $17.2169
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 19
- cache_create_5m: 0
- cache_create_1h: 45,829
- cache_read: 8,249,036
- output: 46,243

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 19 msgs (100%), $17.2169 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Edit: 5
- Bash: 5
- Write: 3
- Read: 1

## Tool Result Sizes (bytes)

- count: 15
- sum: 11,624
- p50: 156
- p90: 2,238
- max: 7,718

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 5 calls, 401B results, ~20,612 cache_create tok (51.4×)
- Edit: 5 calls, 790B results, ~7,301 cache_create tok (9.24×)
- Write: 3 calls, 477B results, ~4,329 cache_create tok (9.08×)
- Read: 1 calls, 2,238B results, ~1,155 cache_create tok (0.52×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 19
- usd: $17.2169
- input: 19
- cache_create_5m: 0
- cache_create_1h: 45,829
- cache_read: 8,249,036
- output: 46,243

