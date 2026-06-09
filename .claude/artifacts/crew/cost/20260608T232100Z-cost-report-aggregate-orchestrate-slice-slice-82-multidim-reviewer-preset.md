---
kind: cost-report
slice: SLICE-82
run_title: "orchestrate-slice SLICE-82 multidim reviewer preset"
usd: 127.9449
duration_ms: 1497869
total_tokens: 47638706
cache_hit_pct: 96
review_decision: approved_with_notes
validation_decision: passed
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-06-08T23:21:00.794Z
---

# Cost Report: orchestrate-slice SLICE-82 multidim reviewer preset

- Created: 2026-06-08T23:21:00.794Z
- Run Title: orchestrate-slice SLICE-82 multidim reviewer preset
- Window Start: 2026-06-08T22:55:59.209Z
- Window End: 2026-06-08T23:20:57.078Z
- Duration: 25.0 min (1497869 ms)
- Sessions Scanned: 6
- Assistant Messages Counted: 374
- Total Tokens: 47,638,706
- Cache Hit %: 96%
- Total USD: $127.9449
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 171 msgs, $96.4374
- C--work-mega-hero-crew: 156 msgs, $29.0837
- C--work-mega-loopobserver: 47 msgs, $2.4238

## Outcome Linkage

- Slice: SLICE-82
- Grade Avg: -
- Review Decision: approved_with_notes
- Validation Decision: passed

## Tokens (totals)

- input: 731
- cache_create_5m: 0
- cache_create_1h: 1,865,447
- cache_read: 45,128,400
- output: 644,128

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 180 msgs (48.13%), $116.9370 (91.4%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 194 msgs (51.87%), $11.0079 (8.6%)

## Conversation Shape

- user_msg_count: 14
- user_msg_avg_len: 1123
- turns_before_first_tool: 2
- compaction_count: 6
- skill_invocations: 1
- subagent_dispatches: 30

## Tool Usage

- Bash: 78 (4 failed)
- Read: 39
- Agent: 30
- TaskCreate: 17
- TaskUpdate: 15
- Grep: 12
- Write: 9
- Glob: 8
- Edit: 6
- AskUserQuestion: 5
- ToolSearch: 2
- ExitPlanMode: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 225
- sum: 305,117
- p50: 202
- p90: 3,262
- max: 15,386

## File Re-reads

- redundant_read_count: 6
- top paths:
  - 3× C:\work\mega\loop\docs\research\2026-05-28-competitor-gap-audit\matrix.md
  - 2× C:\work\mega\hero-crew\scripts\validate-agents.ts
  - 2× C:\work\mega\hero-crew\docs\routing-table.md
  - 2× C:\work\mega\hero-crew\scripts\lib\build-bundle\assemble.ts
  - 2× C:\work\mega\loop\scripts\lib\reviewer-ladder.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 78 calls, 34,890B results, ~541,176 cache_create tok (15.51×)
- Agent: 28 calls, 32,809B results, ~540,984 cache_create tok (16.49×)
- Read: 39 calls, 196,075B results, ~319,375 cache_create tok (1.63×)
- TaskUpdate: 15 calls, 333B results, ~169,263 cache_create tok (508.3×)
- Write: 9 calls, 1,523B results, ~117,243 cache_create tok (76.98×)
- Glob: 8 calls, 16,127B results, ~70,209 cache_create tok (4.35×)
- AskUserQuestion: 5 calls, 1,235B results, ~23,080 cache_create tok (18.69×)
- Skill: 1 calls, 39B results, ~20,132 cache_create tok (516.21×)
- TaskCreate: 17 calls, 1,026B results, ~16,931 cache_create tok (16.5×)
- Grep: 12 calls, 6,330B results, ~11,875 cache_create tok (1.88×)
- ExitPlanMode: 1 calls, 9,519B results, ~9,300 cache_create tok (0.98×)
- Edit: 6 calls, 978B results, ~5,848 cache_create tok (5.98×)
- ToolSearch: 2 calls, 157B results, ~3,579 cache_create tok (22.8×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 194
- usd: $11.0079
- input: 230
- cache_create_5m: 0
- cache_create_1h: 603,394
- cache_read: 18,498,350
- output: 122,491

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 180
- usd: $116.9370
- input: 501
- cache_create_5m: 0
- cache_create_1h: 1,262,053
- cache_read: 26,630,050
- output: 521,637

