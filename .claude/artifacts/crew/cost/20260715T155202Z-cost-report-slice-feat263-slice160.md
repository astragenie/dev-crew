---
kind: cost-report
feature: FEAT-263
run_title: "FEAT263 SLICE160"
usd: 36.057
duration_ms: 1855273
total_tokens: 16507657
cache_hit_pct: 99.1
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-15T15:52:02.085Z
---

# Cost Report: FEAT263 SLICE160

- Created: 2026-07-15T15:52:02.085Z
- Run Title: FEAT263 SLICE160
- Window Start: 2026-07-15T15:21:05.809Z
- Window End: 2026-07-15T15:52:01.082Z
- Duration: 30.9 min (1855273 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 80
- Total Tokens: 16,507,657
- Cache Hit %: 99.1%
- Total USD: $36.0570
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 150
- cache_create_5m: 0
- cache_create_1h: 153,072
- cache_read: 16,260,136
- output: 94,299

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 80 msgs (100%), $36.0570 (100%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 1325
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 2

## Tool Usage

- Bash: 15 (1 failed)
- Edit: 4
- Read: 3
- Agent: 2
- Write: 1
- AskUserQuestion: 1
- PowerShell: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 29
- sum: 31,515
- p50: 299
- p90: 3,550
- max: 11,461

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 15 calls, 6,770B results, ~68,876 cache_create tok (10.17×)
- Read: 3 calls, 9,934B results, ~17,277 cache_create tok (1.74×)
- Skill: 1 calls, 29B results, ~14,853 cache_create tok (512.17×)
- Agent: 2 calls, 1,898B results, ~13,493 cache_create tok (7.11×)
- PowerShell: 1 calls, 104B results, ~9,556 cache_create tok (91.88×)
- AskUserQuestion: 1 calls, 410B results, ~7,383 cache_create tok (18.01×)
- Edit: 4 calls, 688B results, ~5,207 cache_create tok (7.57×)
- Write: 1 calls, 221B results, ~1,619 cache_create tok (7.33×)


## By Model (token detail)

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 80
- usd: $36.0570
- input: 150
- cache_create_5m: 0
- cache_create_1h: 153,072
- cache_read: 16,260,136
- output: 94,299

