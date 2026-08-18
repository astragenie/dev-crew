---
kind: cost-report
feature: FEAT-001
run_title: "FEAT001 SLICE01"
usd: 2.2625
duration_ms: 760428
total_tokens: 5973856
cache_hit_pct: 99.4
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-18T21:24:09.205Z
---

# Cost Report: FEAT001 SLICE01

- Created: 2026-08-18T21:24:09.205Z
- Run Title: FEAT001 SLICE01
- Window Start: 2026-08-18T21:11:22.403Z
- Window End: 2026-08-18T21:24:02.831Z
- Duration: 12.7 min (760428 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 20
- Total Tokens: 5,973,856
- Cache Hit %: 99.4%
- Total USD: $2.2625
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 40
- cache_create_5m: 0
- cache_create_1h: 36,948
- cache_read: 5,919,203
- output: 17,665

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 20 msgs (100%), $2.2625 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 1778
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 2

## Tool Usage

- Bash: 3
- Agent: 2
- Read: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 7
- sum: 11,203
- p50: 315
- p90: 7,739
- max: 7,739

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Skill: 1 calls, 29B results, ~8,148 cache_create tok (280.97×)
- Agent: 2 calls, 628B results, ~7,156 cache_create tok (11.39×)
- Bash: 2 calls, 952B results, ~6,749 cache_create tok (7.09×)
- Read: 1 calls, 1,855B results, ~3,981 cache_create tok (2.15×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 20
- usd: $2.2625
- input: 40
- cache_create_5m: 0
- cache_create_1h: 36,948
- cache_read: 5,919,203
- output: 17,665

