---
kind: cost-report
run_title: "FEAT-025 SLICE-B — auto-walker risk gate + preflight — SHIPPED"
usd: 11.1736
duration_ms: 1492317
total_tokens: 28424734
cache_hit_pct: 99.5
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-03T07:11:42.038Z
---

# Cost Report: FEAT-025 SLICE-B — auto-walker risk gate + preflight — SHIPPED

- Created: 2026-06-03T07:11:42.038Z
- Run Title: FEAT-025 SLICE-B — auto-walker risk gate + preflight — SHIPPED
- Window Start: 2026-06-03T06:46:44.406Z
- Window End: 2026-06-03T07:11:36.723Z
- Duration: 24.9 min (1492317 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 109
- Total Tokens: 28,424,734
- Cache Hit %: 99.5%
- Total USD: $11.1736
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-common: 72 msgs, $7.2722
- C--work-mega-loop: 37 msgs, $3.9014

## Tokens (totals)

- input: 866
- cache_create_5m: 54,841
- cache_create_1h: 98,936
- cache_read: 28,214,069
- output: 56,022

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 103 msgs (94.5%), $9.8396 (88.06%)
- claude-opus-4-7 (priced as claude-opus-4): 6 msgs (5.5%), $1.3340 (11.94%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 233
- turns_before_first_tool: 1
- compaction_count: 1
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- PowerShell: 13
- Bash: 12
- Read: 4
- Edit: 4 (1 failed)
- ScheduleWakeup: 3
- Agent: 2
- StructuredOutput: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 40
- sum: 29,434
- p50: 258
- p90: 2,284
- max: 5,138

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- PowerShell: 13 calls, 14,408B results, ~52,279 cache_create tok (3.63×)
- Bash: 11 calls, 6,752B results, ~16,115 cache_create tok (2.39×)
- Agent: 2 calls, 3,136B results, ~11,988 cache_create tok (3.82×)
- Read: 4 calls, 3,672B results, ~6,972 cache_create tok (1.9×)
- Edit: 4 calls, 562B results, ~6,812 cache_create tok (12.12×)
- ScheduleWakeup: 3 calls, 470B results, ~5,170 cache_create tok (11×)
- Write: 1 calls, 213B results, ~1,802 cache_create tok (8.46×)
- StructuredOutput: 1 calls, 39B results, ~1,507 cache_create tok (38.64×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 6
- usd: $1.3340
- input: 16
- cache_create_5m: 54,841
- cache_create_1h: 0
- cache_read: 103,306
- output: 2,007

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 103
- usd: $9.8396
- input: 850
- cache_create_5m: 0
- cache_create_1h: 98,936
- cache_read: 28,110,763
- output: 54,015

