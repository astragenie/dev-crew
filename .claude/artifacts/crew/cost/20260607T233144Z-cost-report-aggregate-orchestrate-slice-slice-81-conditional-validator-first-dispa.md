---
kind: cost-report
slice: SLICE-81
run_title: "orchestrate-slice: SLICE-81 conditional validator-first dispatch for short slices"
usd: 52.1765
duration_ms: 2080033
total_tokens: 34029216
cache_hit_pct: 97.9
review_decision: approved
validation_decision: passed
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-06-07T23:31:44.748Z
---

# Cost Report: orchestrate-slice: SLICE-81 conditional validator-first dispatch for short slices

- Created: 2026-06-07T23:31:44.748Z
- Run Title: orchestrate-slice: SLICE-81 conditional validator-first dispatch for short slices
- Window Start: 2026-06-07T22:57:01.200Z
- Window End: 2026-06-07T23:31:41.233Z
- Duration: 34.7 min (2080033 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 244
- Total Tokens: 34,029,216
- Cache Hit %: 97.9%
- Total USD: $52.1765
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-hero-crew: 96 msgs, $31.2365
- C--work-mega-loopobserver: 97 msgs, $18.9721
- C--work-mega-loop: 51 msgs, $1.9679

## Outcome Linkage

- Slice: SLICE-81
- Grade Avg: -
- Review Decision: approved
- Validation Decision: passed

## Tokens (totals)

- input: 331
- cache_create_5m: 0
- cache_create_1h: 700,468
- cache_read: 33,168,115
- output: 160,302

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 123 msgs (50.41%), $44.5222 (85.33%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 121 msgs (49.59%), $7.6543 (14.67%)

## Conversation Shape

- user_msg_count: 8
- user_msg_avg_len: 1652
- turns_before_first_tool: 2
- compaction_count: 6
- skill_invocations: 3
- subagent_dispatches: 20

## Tool Usage

- Bash: 56 (2 failed)
- Agent: 20
- Read: 19 (1 failed)
- Edit: 10
- Write: 7
- PowerShell: 6 (3 failed)
- Skill: 3
- Glob: 2

## Tool Result Sizes (bytes)

- count: 124
- sum: 149,236
- p50: 367
- p90: 2,548
- max: 15,150

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 2× C:\Users\serge\.claude\projects\C--work-mega-loopobserver\memory\MEMORY.md
  - 2× C:\work\mega\loopobserver\src\LoopBrain.Web\src\pages\AgentsPage.tsx
  - 2× C:\work\mega\loopobserver\.claude\state\grade-trend.json

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 56 calls, 42,847B results, ~333,878 cache_create tok (7.79×)
- Edit: 10 calls, 1,657B results, ~136,273 cache_create tok (82.24×)
- Agent: 20 calls, 32,494B results, ~95,311 cache_create tok (2.93×)
- Read: 19 calls, 67,239B results, ~71,719 cache_create tok (1.07×)
- Skill: 3 calls, 112B results, ~24,535 cache_create tok (219.06×)
- Write: 7 calls, 1,484B results, ~22,403 cache_create tok (15.1×)
- PowerShell: 5 calls, 708B results, ~6,523 cache_create tok (9.21×)
- Glob: 2 calls, 28B results, ~5,872 cache_create tok (209.71×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 123
- usd: $44.5222
- input: 166
- cache_create_5m: 0
- cache_create_1h: 153,816
- cache_read: 22,428,515
- output: 83,499

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 121
- usd: $7.6543
- input: 165
- cache_create_5m: 0
- cache_create_1h: 546,652
- cache_read: 10,739,600
- output: 76,803

