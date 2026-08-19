---
kind: cost-report
feature: FEAT-013
run_title: "FEAT013 SLICE34"
usd: 4.1644
duration_ms: 660962
total_tokens: 12729279
cache_hit_pct: 99.8
source_project: C--work-mega-runner-plugin
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-08-19T21:27:51.625Z
---

# Cost Report: FEAT013 SLICE34

- Created: 2026-08-19T21:27:51.625Z
- Run Title: FEAT013 SLICE34
- Window Start: 2026-08-19T21:16:47.578Z
- Window End: 2026-08-19T21:27:48.540Z
- Duration: 11.0 min (660962 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 26
- Total Tokens: 12,729,279
- Cache Hit %: 99.8%
- Total USD: $4.1644
- Source Project: C--work-mega-runner-plugin
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 52
- cache_create_5m: 0
- cache_create_1h: 28,424
- cache_read: 12,688,324
- output: 12,479

## Model Mix

- claude-fable-5 (priced as claude-sonnet-4): 26 msgs (100%), $4.1644 (100%)

## Conversation Shape

- user_msg_count: 7
- user_msg_avg_len: 2796
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- SendMessage: 5
- Bash: 4
- Write: 2
- Agent: 1

## Tool Result Sizes (bytes)

- count: 12
- sum: 3,415
- p50: 372
- p90: 392
- max: 440

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- SendMessage: 5 calls, 1,896B results, ~12,785 cache_create tok (6.74×)
- Bash: 3 calls, 633B results, ~8,186 cache_create tok (12.93×)
- Agent: 1 calls, 313B results, ~4,653 cache_create tok (14.87×)
- Write: 2 calls, 460B results, ~1,717 cache_create tok (3.73×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 26
- usd: $4.1644
- input: 52
- cache_create_5m: 0
- cache_create_1h: 28,424
- cache_read: 12,688,324
- output: 12,479

