---
kind: cost-report
slice: SLICE-22
run_title: "FEAT-009 SLICE-22 — PR autofix loop — SHIPPED"
usd: 18.7792
duration_ms: 1009808
total_tokens: 32295139
cache_hit_pct: 97.0
review_decision: approved
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-06-03T09:00:32.240Z
---

# Cost Report: FEAT-009 SLICE-22 — PR autofix loop — SHIPPED

- Created: 2026-06-03T09:00:32.240Z
- Run Title: FEAT-009 SLICE-22 — PR autofix loop — SHIPPED
- Window Start: 2026-06-03T08:43:37.117Z
- Window End: 2026-06-03T09:00:26.925Z
- Duration: 16.8 min (1009808 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 110
- Total Tokens: 32,295,139
- Cache Hit %: 97.0%
- Total USD: $18.7792
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 55 msgs, $8.8674
- C--work-mega-common: 16 msgs, $5.7491
- C--work-mega-devops: 39 msgs, $4.1628

## Outcome Linkage

- Slice: SLICE-22
- Grade Avg: -
- Review Decision: approved
- Validation Decision: -

## Tokens (totals)

- input: 836
- cache_create_5m: 69,525
- cache_create_1h: 884,658
- cache_read: 31,240,723
- output: 99,397

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 102 msgs (92.73%), $15.8481 (84.39%)
- claude-opus-4-7 (priced as claude-opus-4): 8 msgs (7.27%), $2.9310 (15.61%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 32
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- PowerShell: 13
- Bash: 10 (2 failed)
- Read: 8
- Edit: 6
- Write: 3
- Agent: 2
- StructuredOutput: 1

## Tool Result Sizes (bytes)

- count: 43
- sum: 42,804
- p50: 297
- p90: 2,694
- max: 7,837

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 3× C:\work\mega\loop\src\tests\pr-fixer.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- PowerShell: 12 calls, 17,911B results, ~78,409 cache_create tok (4.38×)
- Bash: 9 calls, 3,201B results, ~46,924 cache_create tok (14.66×)
- Read: 8 calls, 16,220B results, ~39,878 cache_create tok (2.46×)
- Edit: 6 calls, 977B results, ~21,721 cache_create tok (22.23×)
- Agent: 2 calls, 1,961B results, ~15,357 cache_create tok (7.83×)
- Write: 3 calls, 561B results, ~7,976 cache_create tok (14.22×)
- StructuredOutput: 1 calls, 39B results, ~1,487 cache_create tok (38.13×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 102
- usd: $15.8481
- input: 828
- cache_create_5m: 0
- cache_create_1h: 884,658
- cache_read: 30,909,433
- output: 84,325

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 8
- usd: $2.9310
- input: 8
- cache_create_5m: 69,525
- cache_create_1h: 0
- cache_read: 331,290
- output: 15,072

