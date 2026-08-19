---
kind: cost-report
feature: FEAT-005
run_title: "FEAT005 SLICE24"
usd: 26.4347
duration_ms: 6705684
total_tokens: 80875288
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T09:03:27.045Z
---

# Cost Report: FEAT005 SLICE24

- Created: 2026-08-19T09:03:27.045Z
- Run Title: FEAT005 SLICE24
- Window Start: 2026-08-19T07:11:37.889Z
- Window End: 2026-08-19T09:03:23.573Z
- Duration: 111.8 min (6705684 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 108
- Total Tokens: 80,875,288
- Cache Hit %: 99.8%
- Total USD: $26.4347
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 216
- cache_create_5m: 0
- cache_create_1h: 146,121
- cache_read: 80,637,886
- output: 91,065

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 108 msgs (100%), $26.4347 (100%)

## Conversation Shape

- user_msg_count: 22
- user_msg_avg_len: 2101
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 8

## Tool Usage

- Bash: 20 (1 failed)
- Agent: 8
- SendMessage: 4
- Edit: 2
- Workflow: 1
- Read: 1

## Tool Result Sizes (bytes)

- count: 36
- sum: 22,192
- p50: 319
- p90: 1,226
- max: 5,100

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 19 calls, 15,305B results, ~70,342 cache_create tok (4.6×)
- Agent: 8 calls, 2,516B results, ~51,930 cache_create tok (20.64×)
- SendMessage: 4 calls, 1,521B results, ~18,734 cache_create tok (12.32×)
- Edit: 2 calls, 312B results, ~1,653 cache_create tok (5.3×)
- Read: 1 calls, 639B results, ~1,314 cache_create tok (2.06×)
- Workflow: 1 calls, 1,249B results, ~537 cache_create tok (0.43×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 108
- usd: $26.4347
- input: 216
- cache_create_5m: 0
- cache_create_1h: 146,121
- cache_read: 80,637,886
- output: 91,065

