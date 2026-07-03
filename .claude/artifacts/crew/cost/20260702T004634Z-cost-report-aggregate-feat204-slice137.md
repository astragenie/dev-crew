---
kind: cost-report
feature: FEAT-204
run_title: "FEAT204 SLICE137"
usd: 133.08
duration_ms: 1202620
total_tokens: 78974134
cache_hit_pct: 99.7
source_project: aggregate
aggregate_all: true
source_count: 6
created_at: 2026-07-02T00:46:34.958Z
---

# Cost Report: FEAT204 SLICE137

- Created: 2026-07-02T00:46:34.958Z
- Run Title: FEAT204 SLICE137
- Window Start: 2026-07-02T00:26:23.770Z
- Window End: 2026-07-02T00:46:26.390Z
- Duration: 20.0 min (1202620 ms)
- Sessions Scanned: 6
- Assistant Messages Counted: 146
- Total Tokens: 78,974,134
- Cache Hit %: 99.7%
- Total USD: $133.0800
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-memory--claude-worktrees-cleanup: 68 msgs, $71.9729
- C--work-mega-astramemory-plugin: 23 msgs, $28.7106
- C--work-mega-runner-plugin: 29 msgs, $14.4622
- C--work-mega-sales: 15 msgs, $8.3769
- C--work-mega-dev-team: 9 msgs, $6.5715
- C--work-mega-runner: 2 msgs, $2.9860

## Tokens (totals)

- input: 238
- cache_create_5m: 0
- cache_create_1h: 245,758
- cache_read: 78,624,581
- output: 103,557

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 146 msgs (100%), $133.0800 (100%)

## Conversation Shape

- user_msg_count: 9
- user_msg_avg_len: 1516
- turns_before_first_tool: 2
- compaction_count: 4
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 61
- Read: 10
- Edit: 10 (1 failed)
- Agent: 4
- TaskCreate: 1
- TaskUpdate: 1
- SendMessage: 1
- Grep: 1

## Tool Result Sizes (bytes)

- count: 88
- sum: 94,906
- p50: 198
- p90: 4,557
- max: 8,999

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\memory\.claude\worktrees\cleanup\src\AstraMemory.Api\Program.cs
  - 2× C:\Users\serge\AppData\Local\Temp\claude\C--work-mega-runner-plugin\7825bd92-7d4c-489c-b8c7-9fbe6c1f8c47\tasks\b060g2l9q.output

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 59 calls, 68,878B results, ~174,267 cache_create tok (2.53×)
- Agent: 4 calls, 8,438B results, ~29,694 cache_create tok (3.52×)
- Edit: 10 calls, 1,783B results, ~17,474 cache_create tok (9.8×)
- Read: 9 calls, 13,043B results, ~16,386 cache_create tok (1.26×)
- SendMessage: 1 calls, 380B results, ~2,916 cache_create tok (7.67×)
- Grep: 1 calls, 233B results, ~648 cache_create tok (2.78×)
- TaskCreate: 1 calls, 89B results, ~190 cache_create tok (2.13×)
- TaskUpdate: 1 calls, 30B results, ~190 cache_create tok (6.33×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 146
- usd: $133.0800
- input: 238
- cache_create_5m: 0
- cache_create_1h: 245,758
- cache_read: 78,624,581
- output: 103,557

