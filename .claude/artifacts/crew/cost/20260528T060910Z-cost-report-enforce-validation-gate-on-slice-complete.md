---
kind: cost-report
run_title: "enforce-validation-gate-on-slice-complete"
usd: 89.9798
duration_ms: 715773
total_tokens: 43091470
cache_hit_pct: 99.1
source_project: aggregate
aggregate_all: true
source_count: 4
created_at: 2026-05-28T06:09:10.917Z
---

# Cost Report: enforce-validation-gate-on-slice-complete

- Created: 2026-05-28T06:09:10.917Z
- Run Title: enforce-validation-gate-on-slice-complete
- Window Start: 2026-05-28T05:57:13.786Z
- Window End: 2026-05-28T06:09:09.559Z
- Duration: 11.9 min (715773 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 215
- Total Tokens: 43,091,470
- Cache Hit %: 99.1%
- Total USD: $89.9798
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-AstraGenie-MemoryService: 80 msgs, $37.6045
- C--work-mega-hero-crew-autonomous-loop: 98 msgs, $34.7004
- C--work-mega-Astra-Humanizer: 21 msgs, $9.9653
- C--work-mega-Astra-LoopObserver: 16 msgs, $7.7096

## Tokens (totals)

- input: 1,294
- cache_create_5m: 0
- cache_create_1h: 385,351
- cache_read: 42,509,687
- output: 195,138

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 215 msgs (100%), $89.9798 (100%)

## Conversation Shape

- user_msg_count: 7
- user_msg_avg_len: 401
- turns_before_first_tool: 1
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 0

## Tool Usage

- Bash: 53 (1 failed)
- Edit: 36
- TaskUpdate: 18
- Read: 15
- ToolSearch: 5
- Write: 2
- TaskList: 1
- PushNotification: 1
- AskUserQuestion: 1

## Tool Result Sizes (bytes)

- count: 134
- sum: 131,572
- p50: 189
- p90: 1,969
- max: 28,736

## File Re-reads

- redundant_read_count: 4
- top paths:
  - 3× C:\work\mega\hero-crew-autonomous-loop\scripts\lib\slice-linker\crew-bridge.mjs
  - 3× C:\work\mega\hero-crew-autonomous-loop\tests\slice-complete.test.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 53 calls, 59,495B results, ~130,978 cache_create tok (2.2×)
- Edit: 36 calls, 6,454B results, ~94,602 cache_create tok (14.66×)
- Read: 15 calls, 63,440B results, ~74,189 cache_create tok (1.17×)
- TaskUpdate: 18 calls, 414B results, ~44,558 cache_create tok (107.63×)
- ToolSearch: 5 calls, 701B results, ~19,783 cache_create tok (28.22×)
- Write: 2 calls, 331B results, ~10,328 cache_create tok (31.2×)
- PushNotification: 1 calls, 75B results, ~5,186 cache_create tok (69.15×)
- TaskList: 1 calls, 14B results, ~922 cache_create tok (65.86×)
- AskUserQuestion: 1 calls, 129B results, ~335 cache_create tok (2.6×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 215
- usd: $89.9798
- input: 1,294
- cache_create_5m: 0
- cache_create_1h: 385,351
- cache_read: 42,509,687
- output: 195,138

