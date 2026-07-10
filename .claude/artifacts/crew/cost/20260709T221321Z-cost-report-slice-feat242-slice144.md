---
kind: cost-report
feature: FEAT-242
run_title: "FEAT242 SLICE144"
usd: 35.8262
duration_ms: 10805434
total_tokens: 66141508
cache_hit_pct: 98.3
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-09T22:13:21.301Z
---

# Cost Report: FEAT242 SLICE144

- Created: 2026-07-09T22:13:21.301Z
- Run Title: FEAT242 SLICE144
- Window Start: 2026-07-09T19:13:15.281Z
- Window End: 2026-07-09T22:13:20.715Z
- Duration: 180.1 min (10805434 ms)
- Sessions Scanned: 6
- Assistant Messages Counted: 413
- Total Tokens: 66,141,508
- Cache Hit %: 98.3%
- Total USD: $35.8262
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 116,160
- cache_create_5m: 334,675
- cache_create_1h: 659,443
- cache_read: 64,780,421
- output: 250,809

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 386 msgs (93.46%), $26.9890 (75.33%)
- claude-opus-4-7 (priced as claude-opus-4): 27 msgs (6.54%), $8.8372 (24.67%)

## Conversation Shape

- user_msg_count: 16
- user_msg_avg_len: 8809
- turns_before_first_tool: 1
- compaction_count: 6
- skill_invocations: 6
- subagent_dispatches: 8

## Tool Usage

- Bash: 136 (3 failed)
- Read: 24 (6 failed)
- Edit: 24
- Agent: 8
- Skill: 6
- Write: 5
- StructuredOutput: 2
- Grep: 2
- Glob: 1
- ToolSearch: 1
- SendMessage: 1
- AskUserQuestion: 1

## Tool Result Sizes (bytes)

- count: 210
- sum: 261,873
- p50: 290
- p90: 3,099
- max: 26,471

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\runner-plugin\src\scripts\lib\watch\sweep.mts
  - 2× C:\work\mega\runner-plugin\.claude\worktrees\fix-402\agents\pm.md

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 135 calls, 100,411B results, ~347,521 cache_create tok (3.46×)
- Read: 24 calls, 116,530B results, ~193,043 cache_create tok (1.66×)
- Skill: 6 calls, 176B results, ~138,497 cache_create tok (786.91×)
- ToolSearch: 1 calls, 53B results, ~63,831 cache_create tok (1204.36×)
- Agent: 7 calls, 17,186B results, ~52,750 cache_create tok (3.07×)
- Edit: 24 calls, 4,286B results, ~23,886 cache_create tok (5.57×)
- Glob: 1 calls, 235B results, ~20,378 cache_create tok (86.71×)
- Grep: 2 calls, 8,553B results, ~18,778 cache_create tok (2.2×)
- StructuredOutput: 2 calls, 78B results, ~16,683 cache_create tok (213.88×)
- Write: 5 calls, 1,074B results, ~9,727 cache_create tok (9.06×)
- SendMessage: 1 calls, 609B results, ~1,665 cache_create tok (2.73×)
- AskUserQuestion: 1 calls, 200B results, ~1,391 cache_create tok (6.96×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 27
- usd: $8.8372
- input: 62
- cache_create_5m: 334,675
- cache_create_1h: 0
- cache_read: 963,438
- output: 14,880

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 386
- usd: $26.9890
- input: 116,098
- cache_create_5m: 0
- cache_create_1h: 659,443
- cache_read: 63,816,983
- output: 235,929

