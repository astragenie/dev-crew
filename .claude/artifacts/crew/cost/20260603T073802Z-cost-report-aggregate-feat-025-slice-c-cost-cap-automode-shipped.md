---
kind: cost-report
run_title: "FEAT-025 SLICE-C — cost cap + autoMode — SHIPPED"
usd: 10.237
duration_ms: 1417584
total_tokens: 20257419
cache_hit_pct: 98.2
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-06-03T07:38:02.196Z
---

# Cost Report: FEAT-025 SLICE-C — cost cap + autoMode — SHIPPED

- Created: 2026-06-03T07:38:02.196Z
- Run Title: FEAT-025 SLICE-C — cost cap + autoMode — SHIPPED
- Window Start: 2026-06-03T07:14:19.049Z
- Window End: 2026-06-03T07:37:56.633Z
- Duration: 23.6 min (1417584 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 109
- Total Tokens: 20,257,419
- Cache Hit %: 98.2%
- Total USD: $10.2370
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 48 msgs, $6.0016
- C--work-mega-devops: 53 msgs, $3.4756
- C--work-mega-common: 8 msgs, $0.7598

## Tokens (totals)

- input: 869
- cache_create_5m: 12,985
- cache_create_1h: 359,496
- cache_read: 19,819,807
- output: 64,262

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 103 msgs (94.5%), $8.8384 (86.34%)
- claude-opus-4-7 (priced as claude-opus-4): 6 msgs (5.5%), $1.3986 (13.66%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 84
- turns_before_first_tool: 1
- compaction_count: 4
- skill_invocations: 2
- subagent_dispatches: 4

## Tool Usage

- Bash: 17
- Read: 6
- Edit: 5
- Agent: 4
- PowerShell: 3
- Glob: 3
- Skill: 2
- Grep: 2
- StructuredOutput: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 43
- sum: 114,116
- p50: 336
- p90: 2,220
- max: 79,254

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 6 calls, 96,543B results, ~190,417 cache_create tok (1.97×)
- PowerShell: 3 calls, 2,429B results, ~60,108 cache_create tok (24.75×)
- Bash: 16 calls, 11,027B results, ~57,287 cache_create tok (5.2×)
- Edit: 4 calls, 654B results, ~16,925 cache_create tok (25.88×)
- Agent: 4 calls, 2,568B results, ~15,135 cache_create tok (5.89×)
- Skill: 2 calls, 80B results, ~12,249 cache_create tok (153.11×)
- Grep: 2 calls, 118B results, ~8,073 cache_create tok (68.42×)
- Glob: 3 calls, 266B results, ~6,357 cache_create tok (23.9×)
- StructuredOutput: 1 calls, 39B results, ~3,354 cache_create tok (86×)
- Write: 1 calls, 210B results, ~1,654 cache_create tok (7.88×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 103
- usd: $8.8384
- input: 863
- cache_create_5m: 0
- cache_create_1h: 359,496
- cache_read: 19,521,036
- output: 54,837

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 6
- usd: $1.3986
- input: 6
- cache_create_5m: 12,985
- cache_create_1h: 0
- cache_read: 298,771
- output: 9,425

