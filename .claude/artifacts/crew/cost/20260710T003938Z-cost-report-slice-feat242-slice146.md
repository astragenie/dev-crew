---
kind: cost-report
feature: FEAT-242
run_title: "FEAT242 SLICE146"
usd: 9.7611
duration_ms: 1827752
total_tokens: 9217866
cache_hit_pct: 97
source_project: C--work-mega-runner-plugin
aggregate_all: false
source_count: 1
created_at: 2026-07-10T00:39:38.052Z
---

# Cost Report: FEAT242 SLICE146

- Created: 2026-07-10T00:39:38.052Z
- Run Title: FEAT242 SLICE146
- Window Start: 2026-07-10T00:09:08.828Z
- Window End: 2026-07-10T00:39:36.580Z
- Duration: 30.5 min (1827752 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 63
- Total Tokens: 9,217,866
- Cache Hit %: 97%
- Total USD: $9.7611
- Source Project: C--work-mega-runner-plugin
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 12,748
- cache_create_5m: 225,537
- cache_create_1h: 36,687
- cache_read: 8,891,448
- output: 51,446

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 17 msgs (26.98%), $6.5224 (66.82%)
- claude-fable-5 (priced as claude-sonnet-4): 46 msgs (73.02%), $3.2388 (33.18%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 5381
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 17 (1 failed)
- Read: 9 (7 failed)
- Write: 2
- Edit: 2 (1 failed)
- Grep: 1
- StructuredOutput: 1
- Agent: 1
- TaskUpdate: 1

## Tool Result Sizes (bytes)

- count: 34
- sum: 9,076
- p50: 168
- p90: 710
- max: 999

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 9 calls, 2,294B results, ~138,731 cache_create tok (60.48×)
- Bash: 16 calls, 5,121B results, ~24,486 cache_create tok (4.78×)
- Edit: 2 calls, 238B results, ~4,391 cache_create tok (18.45×)
- Agent: 1 calls, 315B results, ~3,493 cache_create tok (11.09×)
- Grep: 1 calls, 420B results, ~2,334 cache_create tok (5.56×)
- StructuredOutput: 1 calls, 39B results, ~2,301 cache_create tok (59×)
- Write: 2 calls, 422B results, ~1,652 cache_create tok (3.91×)
- TaskUpdate: 1 calls, 29B results, ~948 cache_create tok (32.69×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 17
- usd: $6.5224
- input: 42
- cache_create_5m: 225,537
- cache_create_1h: 0
- cache_read: 531,203
- output: 19,948

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 46
- usd: $3.2388
- input: 12,706
- cache_create_5m: 0
- cache_create_1h: 36,687
- cache_read: 8,360,245
- output: 31,498

