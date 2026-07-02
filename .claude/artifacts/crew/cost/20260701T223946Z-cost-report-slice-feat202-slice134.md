---
kind: cost-report
feature: FEAT-202
run_title: "FEAT202 SLICE134"
usd: 7.1764
duration_ms: 762762
total_tokens: 2886352
cache_hit_pct: 98.2
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-01T22:39:46.876Z
---

# Cost Report: FEAT202 SLICE134

- Created: 2026-07-01T22:39:46.876Z
- Run Title: FEAT202 SLICE134
- Window Start: 2026-07-01T22:27:04.096Z
- Window End: 2026-07-01T22:39:46.858Z
- Duration: 12.7 min (762762 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 20
- Total Tokens: 2,886,352
- Cache Hit %: 98.2%
- Total USD: $7.1764
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 45
- cache_create_5m: 0
- cache_create_1h: 51,216
- cache_read: 2,816,225
- output: 18,866

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 20 msgs (100%), $7.1764 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 7
- Read: 2
- Agent: 1

## Tool Result Sizes (bytes)

- count: 11
- sum: 17,233
- p50: 227
- p90: 2,893
- max: 11,777

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\runner-plugin\src\scripts\lib\dispatch-worktree.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 1 calls, 2,893B results, ~15,210 cache_create tok (5.26×)
- Bash: 7 calls, 925B results, ~14,788 cache_create tok (15.99×)
- Read: 2 calls, 1,638B results, ~5,039 cache_create tok (3.08×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 20
- usd: $7.1764
- input: 45
- cache_create_5m: 0
- cache_create_1h: 51,216
- cache_read: 2,816,225
- output: 18,866

