---
kind: cost-report
slice: SLICE-59
run_title: "orchestrate-slice: SLICE-59 upstream-request artifact for hero-crew redundant-read hook"
usd: 22.5034
duration_ms: 84106
total_tokens: 14190372
cache_hit_pct: 99.6
source_project: aggregate
aggregate_all: true
source_count: 4
created_at: 2026-06-06T15:21:15.992Z
---

# Cost Report: orchestrate-slice: SLICE-59 upstream-request artifact for hero-crew redundant-read hook

- Created: 2026-06-06T15:21:15.992Z
- Run Title: orchestrate-slice: SLICE-59 upstream-request artifact for hero-crew redundant-read hook
- Window Start: 2026-06-06T15:19:48.906Z
- Window End: 2026-06-06T15:21:13.012Z
- Duration: 1.4 min (84106 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 32
- Total Tokens: 14,190,372
- Cache Hit %: 99.6%
- Total USD: $22.5034
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 7 msgs, $8.3638
- C--work-mega-hero-crew: 10 msgs, $8.2091
- C--work-mega-loop: 5 msgs, $5.3939
- C--work-mega-cortex: 10 msgs, $0.5366

## Outcome Linkage

- Slice: SLICE-59
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 77
- cache_create_5m: 0
- cache_create_1h: 58,821
- cache_read: 14,108,523
- output: 22,951

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 22 msgs (68.75%), $21.9668 (97.62%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 10 msgs (31.25%), $0.5366 (2.38%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 7
- turns_before_first_tool: 0
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 0

## Tool Usage

- Bash: 11
- TaskUpdate: 6
- Write: 2
- Edit: 2
- Read: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 26
- sum: 8,893
- p50: 181
- p90: 924
- max: 2,488

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- TaskUpdate: 6 calls, 120B results, ~19,706 cache_create tok (164.22×)
- Write: 2 calls, 366B results, ~19,089 cache_create tok (52.16×)
- Bash: 11 calls, 4,299B results, ~18,140 cache_create tok (4.22×)
- Edit: 2 calls, 311B results, ~1,026 cache_create tok (3.3×)
- Read: 1 calls, 924B results, ~549 cache_create tok (0.59×)
- Skill: 1 calls, 42B results, ~0 cache_create tok (0×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 10
- usd: $0.5366
- input: 10
- cache_create_5m: 0
- cache_create_1h: 2,412
- cache_read: 1,657,172
- output: 1,664

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 22
- usd: $21.9668
- input: 67
- cache_create_5m: 0
- cache_create_1h: 56,409
- cache_read: 12,451,351
- output: 21,287

