---
kind: cost-report
run_title: "github bootstrap — reverse sync GitHub Issues to local FEATs"
usd: 40.0265
duration_ms: 1521116
total_tokens: 97140114
cache_hit_pct: 99.5
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-02T10:20:27.592Z
---

# Cost Report: github bootstrap — reverse sync GitHub Issues to local FEATs

- Created: 2026-06-02T10:20:27.592Z
- Run Title: github bootstrap — reverse sync GitHub Issues to local FEATs
- Window Start: 2026-06-02T09:55:00.998Z
- Window End: 2026-06-02T10:20:22.114Z
- Duration: 25.4 min (1521116 ms)
- Sessions Scanned: 6
- Assistant Messages Counted: 217
- Total Tokens: 97,140,114
- Cache Hit %: 99.5%
- Total USD: $40.0265
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 125 msgs, $21.1403
- C--work-mega-common: 92 msgs, $18.8862

## Tokens (totals)

- input: 1,598
- cache_create_5m: 240,056
- cache_create_1h: 203,140
- cache_read: 96,580,217
- output: 115,103

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 171 msgs (78.8%), $31.0240 (77.51%)
- claude-opus-4-7 (priced as claude-opus-4): 46 msgs (21.2%), $9.0025 (22.49%)

## Conversation Shape

- user_msg_count: 6
- user_msg_avg_len: 2328
- turns_before_first_tool: 1
- compaction_count: 2
- skill_invocations: 2
- subagent_dispatches: 7

## Tool Usage

- Bash: 27 (2 failed)
- Read: 19 (1 failed)
- Edit: 11
- Grep: 11
- TaskUpdate: 9
- Agent: 7
- Glob: 4
- TaskCreate: 4
- StructuredOutput: 2
- PowerShell: 2
- Skill: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 99
- sum: 136,215
- p50: 219
- p90: 4,192
- max: 20,638

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\loop\scripts\lib\backlog-parser.mjs
  - 2× C:\work\mega\kb\06-tools\loop-github-sync.md

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 7 calls, 20,861B results, ~127,419 cache_create tok (6.11×)
- Bash: 26 calls, 10,748B results, ~89,501 cache_create tok (8.33×)
- Read: 19 calls, 77,595B results, ~71,877 cache_create tok (0.93×)
- Grep: 11 calls, 23,296B results, ~31,051 cache_create tok (1.33×)
- Skill: 2 calls, 98B results, ~20,436 cache_create tok (208.53×)
- Write: 1 calls, 167B results, ~16,038 cache_create tok (96.04×)
- Edit: 11 calls, 2,148B results, ~15,877 cache_create tok (7.39×)
- Glob: 4 calls, 360B results, ~6,878 cache_create tok (19.11×)
- TaskUpdate: 9 calls, 194B results, ~5,692 cache_create tok (29.34×)
- StructuredOutput: 2 calls, 78B results, ~2,575 cache_create tok (33.01×)
- PowerShell: 2 calls, 202B results, ~2,401 cache_create tok (11.89×)
- TaskCreate: 4 calls, 237B results, ~1,813 cache_create tok (7.65×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 46
- usd: $9.0025
- input: 76
- cache_create_5m: 240,056
- cache_create_1h: 0
- cache_read: 1,612,512
- output: 27,754

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 171
- usd: $31.0240
- input: 1,522
- cache_create_5m: 0
- cache_create_1h: 203,140
- cache_read: 94,967,705
- output: 87,349

