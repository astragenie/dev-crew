---
kind: cost-report
slice: SLICE-22
run_title: "FEAT-009 SLICE-22 — PR autofix loop — SHIPPED"
usd: 8.8674
duration_ms: 1009808
total_tokens: 18510841
cache_hit_pct: 99.4
review_decision: approved
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-03T09:00:27.071Z
---

# Cost Report: FEAT-009 SLICE-22 — PR autofix loop — SHIPPED

- Created: 2026-06-03T09:00:27.071Z
- Run Title: FEAT-009 SLICE-22 — PR autofix loop — SHIPPED
- Window Start: 2026-06-03T08:43:37.117Z
- Window End: 2026-06-03T09:00:26.925Z
- Duration: 16.8 min (1009808 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 55
- Total Tokens: 18,510,841
- Cache Hit %: 99.4%
- Total USD: $8.8674
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-22
- Grade Avg: -
- Review Decision: approved
- Validation Decision: -

## Tokens (totals)

- input: 390
- cache_create_5m: 69,525
- cache_create_1h: 39,434
- cache_read: 18,367,234
- output: 34,258

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 47 msgs (85.45%), $5.9363 (66.95%)
- claude-opus-4-7 (priced as claude-opus-4): 8 msgs (14.55%), $2.9310 (33.05%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 10 (2 failed)
- Read: 6
- Edit: 4
- Agent: 1
- Write: 1
- StructuredOutput: 1

## Tool Result Sizes (bytes)

- count: 23
- sum: 16,406
- p50: 197
- p90: 1,803
- max: 5,070

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 3× C:\work\mega\loop\src\tests\pr-fixer.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 9 calls, 3,201B results, ~46,924 cache_create tok (14.66×)
- Read: 6 calls, 11,573B results, ~35,496 cache_create tok (3.07×)
- Agent: 1 calls, 609B results, ~11,424 cache_create tok (18.76×)
- Edit: 4 calls, 605B results, ~10,972 cache_create tok (18.14×)
- StructuredOutput: 1 calls, 39B results, ~1,487 cache_create tok (38.13×)
- Write: 1 calls, 197B results, ~1,114 cache_create tok (5.65×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 47
- usd: $5.9363
- input: 382
- cache_create_5m: 0
- cache_create_1h: 39,434
- cache_read: 18,035,944
- output: 19,186

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 8
- usd: $2.9310
- input: 8
- cache_create_5m: 69,525
- cache_create_1h: 0
- cache_read: 331,290
- output: 15,072

