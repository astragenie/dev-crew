---
kind: cost-report
feature: FEAT-205
run_title: "FEAT205 SLICE138"
usd: 138.5281
duration_ms: 1226193
total_tokens: 83905752
cache_hit_pct: 99.8
source_project: aggregate
aggregate_all: true
source_count: 6
created_at: 2026-07-02T01:44:46.772Z
---

# Cost Report: FEAT205 SLICE138

- Created: 2026-07-02T01:44:46.772Z
- Run Title: FEAT205 SLICE138
- Window Start: 2026-07-02T01:24:13.536Z
- Window End: 2026-07-02T01:44:39.729Z
- Duration: 20.4 min (1226193 ms)
- Sessions Scanned: 7
- Assistant Messages Counted: 166
- Total Tokens: 83,905,752
- Cache Hit %: 99.8%
- Total USD: $138.5281
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-memory--claude-worktrees-cleanup: 58 msgs, $75.2615
- C--work-mega-astramemory-plugin: 18 msgs, $23.1429
- C--work-mega-runner-plugin: 33 msgs, $19.7296
- C--work-mega-runner: 34 msgs, $10.2654
- C--work-mega-sales: 10 msgs, $6.4148
- C--work-mega-dev-team: 13 msgs, $3.7139

## Tokens (totals)

- input: 296
- cache_create_5m: 0
- cache_create_1h: 196,318
- cache_read: 83,612,942
- output: 96,196

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 166 msgs (100%), $138.5281 (100%)

## Conversation Shape

- user_msg_count: 22
- user_msg_avg_len: 803
- turns_before_first_tool: 3
- compaction_count: 4
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Bash: 74 (2 failed)
- Read: 10 (1 failed)
- TaskUpdate: 9
- Edit: 8 (3 failed)
- Agent: 3
- Monitor: 2
- TaskCreate: 1

## Tool Result Sizes (bytes)

- count: 108
- sum: 60,516
- p50: 190
- p90: 1,112
- max: 12,068

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 3× C:\work\mega\runner\docs\content-kb\astrarunner-plan.md
  - 2× C:\Users\serge\AppData\Local\Temp\claude\C--work-mega-runner-plugin\7825bd92-7d4c-489c-b8c7-9fbe6c1f8c47\tasks\bnlw0cwv3.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 73 calls, 31,913B results, ~82,276 cache_create tok (2.58×)
- TaskUpdate: 9 calls, 234B results, ~76,309 cache_create tok (326.11×)
- Edit: 8 calls, 1,239B results, ~9,863 cache_create tok (7.96×)
- Agent: 2 calls, 1,166B results, ~9,395 cache_create tok (8.06×)
- Read: 10 calls, 8,526B results, ~9,290 cache_create tok (1.09×)
- Monitor: 2 calls, 416B results, ~5,122 cache_create tok (12.31×)
- TaskCreate: 1 calls, 63B results, ~195 cache_create tok (3.1×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 166
- usd: $138.5281
- input: 296
- cache_create_5m: 0
- cache_create_1h: 196,318
- cache_read: 83,612,942
- output: 96,196

