---
kind: cost-report
run_title: "rich artifact flags for crew agents"
usd: 14.2847
duration_ms: 187518
total_tokens: 8272494
cache_hit_pct: 99.6
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-05-24T21:23:06.715Z
---

# Cost Report: Cost — rich artifact flags for crew agents

- Created: 2026-05-24T21:23:06.716Z
- Run Title: rich artifact flags for crew agents
- Window Start: 2026-05-24T21:19:58.736Z
- Window End: 2026-05-24T21:23:06.254Z
- Duration: 3.1 min (187518 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 37
- Total Tokens: 8,272,494
- Cache Hit %: 99.6%
- Total USD: $14.2847
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-hero-crew-autonomous-loop: 31 msgs, $10.8017
- C--work-mega-AstraGenie-CityLive: 6 msgs, $3.4829

## Tokens (totals)

- input: 1,732
- cache_create_5m: 0
- cache_create_1h: 33,053
- cache_read: 8,225,321
- output: 12,388

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 37 msgs (100%), $14.2847 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Edit: 9
- Read: 8
- Bash: 7
- Agent: 2

## Tool Result Sizes (bytes)

- count: 27
- sum: 26,009
- p50: 547
- p90: 2,368
- max: 6,218

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 8 calls, 12,382B results, ~14,310 cache_create tok (1.16×)
- Agent: 1 calls, 6,218B results, ~7,759 cache_create tok (1.25×)
- Edit: 9 calls, 1,507B results, ~5,640 cache_create tok (3.74×)
- Bash: 7 calls, 4,418B results, ~3,808 cache_create tok (0.86×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 37
- usd: $14.2847
- input: 1,732
- cache_create_5m: 0
- cache_create_1h: 33,053
- cache_read: 8,225,321
- output: 12,388

