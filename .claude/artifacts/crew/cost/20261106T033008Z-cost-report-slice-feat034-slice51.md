---
kind: cost-report
feature: FEAT-034
run_title: "FEAT034 SLICE51"
usd: 6.6408
duration_ms: 549869
total_tokens: 18182328
cache_hit_pct: 99.5
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
created_at: 2026-11-06T03:30:08.576Z
---

# Cost Report: FEAT034 SLICE51

- Created: 2026-11-06T03:30:08.576Z
- Run Title: FEAT034 SLICE51
- Window Start: 2026-11-06T03:20:58.599Z
- Window End: 2026-11-06T03:30:08.468Z
- Duration: 9.2 min (549869 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 34
- Total Tokens: 18,182,328
- Cache Hit %: 99.5%
- Total USD: $6.6408
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 534
- cache_create_5m: 0
- cache_create_1h: 99,186
- cache_read: 18,040,479
- output: 42,129

## Model Mix

- claude-fable-5-1 (priced as claude-sonnet-4): 34 msgs (100%), $6.6408 (100%)

## Conversation Shape

- user_msg_count: 5
- user_msg_avg_len: 3519
- turns_before_first_tool: 0
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Bash: 8
- Edit: 4
- Agent: 3
- SendMessage: 2

## Tool Result Sizes (bytes)

- count: 17
- sum: 11,054
- p50: 293
- p90: 2,368
- max: 3,344

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 7 calls, 8,315B results, ~43,106 cache_create tok (5.18×)
- SendMessage: 2 calls, 428B results, ~25,545 cache_create tok (59.68×)
- Edit: 4 calls, 636B results, ~16,952 cache_create tok (26.65×)
- Agent: 3 calls, 877B results, ~11,410 cache_create tok (13.01×)


## By Model (token detail)

### claude-fable-5-1 (priced as claude-sonnet-4)
- messages: 34
- usd: $6.6408
- input: 534
- cache_create_5m: 0
- cache_create_1h: 99,186
- cache_read: 18,040,479
- output: 42,129

