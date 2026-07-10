---
kind: cost-report
feature: FEAT-242
run_title: "FEAT242 SLICE145"
usd: 5.6964
duration_ms: 1900177
total_tokens: 6672159
cache_hit_pct: 97.2
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-10T00:08:14.207Z
---

# Cost Report: FEAT242 SLICE145

- Created: 2026-07-10T00:08:14.207Z
- Run Title: FEAT242 SLICE145
- Window Start: 2026-07-09T23:36:33.338Z
- Window End: 2026-07-10T00:08:13.515Z
- Duration: 31.7 min (1900177 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 50
- Total Tokens: 6,672,159
- Cache Hit %: 97.2%
- Total USD: $5.6964
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 7,239
- cache_create_5m: 104,599
- cache_create_1h: 72,678
- cache_read: 6,449,970
- output: 37,673

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 11 msgs (22%), $2.9329 (51.49%)
- claude-fable-5 (priced as claude-sonnet-4): 39 msgs (78%), $2.7635 (48.51%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 11921
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Read: 11 (5 failed)
- TaskUpdate: 6
- TaskCreate: 4
- Edit: 4
- Bash: 3
- Agent: 2
- ToolSearch: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 32
- sum: 39,870
- p50: 152
- p90: 4,484
- max: 13,085

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\runner-plugin\src\scripts\lib\watch\ledger.mts
  - 2× C:\work\mega\runner-plugin\src\scripts\lib\watch\sweep.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 11 calls, 32,906B results, ~73,518 cache_create tok (2.23×)
- TaskUpdate: 6 calls, 155B results, ~17,456 cache_create tok (112.62×)
- Edit: 4 calls, 932B results, ~15,445 cache_create tok (16.57×)
- TaskCreate: 4 calls, 365B results, ~12,004 cache_create tok (32.89×)
- Agent: 2 calls, 632B results, ~9,712 cache_create tok (15.37×)
- Bash: 2 calls, 1,536B results, ~6,544 cache_create tok (4.26×)
- ToolSearch: 1 calls, 152B results, ~3,481 cache_create tok (22.9×)
- Write: 1 calls, 232B results, ~963 cache_create tok (4.15×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 11
- usd: $2.9329
- input: 31
- cache_create_5m: 104,599
- cache_create_1h: 0
- cache_read: 457,749
- output: 3,794

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 39
- usd: $2.7635
- input: 7,208
- cache_create_5m: 0
- cache_create_1h: 72,678
- cache_read: 5,992,221
- output: 33,879

