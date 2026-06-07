---
kind: cost-report
feature: FEAT-061
run_title: "FEAT061 SLICE63"
usd: 18.994
duration_ms: 1359752
total_tokens: 7973650
cache_hit_pct: 98.4
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-07T00:19:46.205Z
---

# Cost Report: FEAT061 SLICE63

- Created: 2026-06-07T00:19:46.205Z
- Run Title: FEAT061 SLICE63
- Window Start: 2026-06-06T23:56:51.430Z
- Window End: 2026-06-07T00:19:31.182Z
- Duration: 22.7 min (1359752 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 67
- Total Tokens: 7,973,650
- Cache Hit %: 98.4%
- Total USD: $18.9940
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 142
- cache_create_5m: 0
- cache_create_1h: 127,453
- cache_read: 7,799,807
- output: 46,248

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 67 msgs (100%), $18.9940 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 5

## Tool Usage

- Bash: 18 (1 failed)
- Agent: 5
- TaskUpdate: 4
- ToolSearch: 4
- Read: 3
- Skill: 1
- Edit: 1

## Tool Result Sizes (bytes)

- count: 36
- sum: 40,258
- p50: 269
- p90: 3,370
- max: 6,826

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 17 calls, 20,873B results, ~36,556 cache_create tok (1.75×)
- Agent: 5 calls, 4,973B results, ~34,750 cache_create tok (6.99×)
- Skill: 1 calls, 39B results, ~18,747 cache_create tok (480.69×)
- ToolSearch: 4 calls, 578B results, ~14,318 cache_create tok (24.77×)
- Read: 3 calls, 10,968B results, ~8,522 cache_create tok (0.78×)
- Edit: 1 calls, 155B results, ~6,904 cache_create tok (44.54×)
- TaskUpdate: 4 calls, 124B results, ~5,104 cache_create tok (41.16×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 67
- usd: $18.9940
- input: 142
- cache_create_5m: 0
- cache_create_1h: 127,453
- cache_read: 7,799,807
- output: 46,248

