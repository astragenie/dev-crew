---
kind: cost-report
feature: FEAT-190
run_title: "FEAT190 SLICE105"
usd: 9.8137
duration_ms: 175860
total_tokens: 5101531
cache_hit_pct: 99.4
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-12T12:10:07.937Z
---

# Cost Report: FEAT190 SLICE105

- Created: 2026-06-12T12:10:07.937Z
- Run Title: FEAT190 SLICE105
- Window Start: 2026-06-12T12:07:11.598Z
- Window End: 2026-06-12T12:10:07.458Z
- Duration: 2.9 min (175860 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 11
- Total Tokens: 5,101,531
- Cache Hit %: 99.4%
- Total USD: $9.8137
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 11
- cache_create_5m: 0
- cache_create_1h: 27,949
- cache_read: 5,055,003
- output: 18,568

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 11 msgs (100%), $9.8137 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Edit: 4
- Bash: 3
- Read: 1

## Tool Result Sizes (bytes)

- count: 9
- sum: 2,818
- p50: 162
- p90: 1,774
- max: 1,774

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 3 calls, 222B results, ~11,918 cache_create tok (53.68×)
- Edit: 4 calls, 654B results, ~10,044 cache_create tok (15.36×)
- Read: 1 calls, 1,774B results, ~1,157 cache_create tok (0.65×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 11
- usd: $9.8137
- input: 11
- cache_create_5m: 0
- cache_create_1h: 27,949
- cache_read: 5,055,003
- output: 18,568

