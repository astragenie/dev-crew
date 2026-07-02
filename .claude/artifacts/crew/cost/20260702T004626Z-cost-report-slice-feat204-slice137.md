---
kind: cost-report
feature: FEAT-204
run_title: "FEAT204 SLICE137"
usd: 14.4622
duration_ms: 1202555
total_tokens: 8384445
cache_hit_pct: 99.6
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-02T00:46:26.363Z
---

# Cost Report: FEAT204 SLICE137

- Created: 2026-07-02T00:46:26.363Z
- Run Title: FEAT204 SLICE137
- Window Start: 2026-07-02T00:26:23.770Z
- Window End: 2026-07-02T00:46:26.325Z
- Duration: 20.0 min (1202555 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 29
- Total Tokens: 8,384,445
- Cache Hit %: 99.6%
- Total USD: $14.4622
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 29
- cache_create_5m: 0
- cache_create_1h: 30,212
- cache_read: 8,340,271
- output: 13,933

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 29 msgs (100%), $14.4622 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 16
- Read: 2
- Agent: 1

## Tool Result Sizes (bytes)

- count: 19
- sum: 6,196
- p50: 158
- p90: 785
- max: 2,594

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\Users\serge\AppData\Local\Temp\claude\C--work-mega-runner-plugin\7825bd92-7d4c-489c-b8c7-9fbe6c1f8c47\tasks\b060g2l9q.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 15 calls, 5,506B results, ~19,708 cache_create tok (3.58×)
- Agent: 1 calls, 297B results, ~8,031 cache_create tok (27.04×)
- Read: 2 calls, 228B results, ~1,961 cache_create tok (8.6×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 29
- usd: $14.4622
- input: 29
- cache_create_5m: 0
- cache_create_1h: 30,212
- cache_read: 8,340,271
- output: 13,933

