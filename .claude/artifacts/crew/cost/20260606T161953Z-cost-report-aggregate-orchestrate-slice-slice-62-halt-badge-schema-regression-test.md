---
kind: cost-report
slice: SLICE-62
run_title: "orchestrate-slice: SLICE-62 halt-badge schema regression test"
usd: 112.205
duration_ms: 300410
total_tokens: 62747507
cache_hit_pct: 99.3
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-06-06T16:19:53.580Z
---

# Cost Report: orchestrate-slice: SLICE-62 halt-badge schema regression test

- Created: 2026-06-06T16:19:53.580Z
- Run Title: orchestrate-slice: SLICE-62 halt-badge schema regression test
- Window Start: 2026-06-06T16:14:50.129Z
- Window End: 2026-06-06T16:19:50.539Z
- Duration: 5.0 min (300410 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 113
- Total Tokens: 62,747,507
- Cache Hit %: 99.3%
- Total USD: $112.2050
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 75 msgs, $72.8571
- C--work-mega-loop: 19 msgs, $24.3031
- C--work-mega-hero-crew: 19 msgs, $15.0448

## Outcome Linkage

- Slice: SLICE-62
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 239
- cache_create_5m: 0
- cache_create_1h: 446,500
- cache_read: 62,227,907
- output: 72,861

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 113 msgs (100%), $112.2050 (100%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 140
- turns_before_first_tool: 1
- compaction_count: 13
- skill_invocations: 3
- subagent_dispatches: 2

## Tool Usage

- Bash: 38
- TaskUpdate: 5
- Write: 3
- Skill: 3
- TaskCreate: 3
- Edit: 2
- Read: 2
- Agent: 2
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 59
- sum: 30,417
- p50: 173
- p90: 1,273
- max: 6,900

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- TaskCreate: 3 calls, 187B results, ~189,380 cache_create tok (1012.73×)
- ToolSearch: 1 calls, 103B results, ~94,306 cache_create tok (915.59×)
- Bash: 38 calls, 20,259B results, ~84,515 cache_create tok (4.17×)
- Skill: 3 calls, 93B results, ~24,358 cache_create tok (261.91×)
- Write: 3 calls, 590B results, ~21,282 cache_create tok (36.07×)
- Read: 2 calls, 8,214B results, ~14,742 cache_create tok (1.79×)
- Agent: 1 calls, 442B results, ~11,379 cache_create tok (25.74×)
- TaskUpdate: 5 calls, 110B results, ~3,664 cache_create tok (33.31×)
- Edit: 2 calls, 320B results, ~2,348 cache_create tok (7.34×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 113
- usd: $112.2050
- input: 239
- cache_create_5m: 0
- cache_create_1h: 446,500
- cache_read: 62,227,907
- output: 72,861

