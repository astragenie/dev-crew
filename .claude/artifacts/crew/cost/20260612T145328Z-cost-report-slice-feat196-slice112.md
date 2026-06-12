---
kind: cost-report
feature: FEAT-196
run_title: "FEAT196 SLICE112"
usd: 9.6886
duration_ms: 200268
total_tokens: 5664919
cache_hit_pct: 99.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T14:53:28.022Z
---

# Cost Report: FEAT196 SLICE112

- Created: 2026-06-12T14:53:28.022Z
- Run Title: FEAT196 SLICE112
- Window Start: 2026-06-12T14:50:07.168Z
- Window End: 2026-06-12T14:53:27.436Z
- Duration: 3.3 min (200268 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 7
- Total Tokens: 5,664,919
- Cache Hit %: 99.8%
- Total USD: $9.6886
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 7
- cache_create_5m: 0
- cache_create_1h: 10,590
- cache_read: 5,642,222
- output: 12,100

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 7 msgs (100%), $9.6886 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Edit: 3
- Bash: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 6
- sum: 893
- p50: 156
- p90: 207
- max: 207

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1 calls, 180B results, ~5,904 cache_create tok (32.8×)
- Edit: 3 calls, 428B results, ~3,780 cache_create tok (8.83×)
- Read: 1 calls, 78B results, ~0 cache_create tok (0×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 7
- usd: $9.6886
- input: 7
- cache_create_5m: 0
- cache_create_1h: 10,590
- cache_read: 5,642,222
- output: 12,100

