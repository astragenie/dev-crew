---
kind: cost-report
feature: FEAT-215
run_title: "FEAT215 SLICE140"
usd: 220.7544
duration_ms: 5851391
total_tokens: 134439612
cache_hit_pct: 99.7
source_project: aggregate
aggregate_all: true
source_count: 5
created_at: 2026-07-03T12:28:08.188Z
---

# Cost Report: FEAT215 SLICE140

- Created: 2026-07-03T12:28:08.188Z
- Run Title: FEAT215 SLICE140
- Window Start: 2026-07-03T10:50:26.134Z
- Window End: 2026-07-03T12:27:57.525Z
- Duration: 97.5 min (5851391 ms)
- Sessions Scanned: 5
- Assistant Messages Counted: 262
- Total Tokens: 134,439,612
- Cache Hit %: 99.7%
- Total USD: $220.7544
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-runner: 175 msgs, $173.7987
- C--work-mega-runner-plugin: 38 msgs, $26.4426
- C--work-mega-sales: 23 msgs, $9.8746
- C--work-mega-hr-team: 9 msgs, $7.6184
- C--work-mega-astramemory-local: 17 msgs, $3.0202

## Tokens (totals)

- input: 32,884
- cache_create_5m: 0
- cache_create_1h: 391,102
- cache_read: 133,749,159
- output: 266,467

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 245 msgs (93.51%), $217.7343 (98.63%)
- claude-fable-5 (priced as claude-sonnet-4): 17 msgs (6.49%), $3.0202 (1.37%)

## Conversation Shape

- user_msg_count: 24
- user_msg_avg_len: 953
- turns_before_first_tool: 1
- compaction_count: 6
- skill_invocations: 0
- subagent_dispatches: 5

## Tool Usage

- Bash: 41
- Read: 22
- Edit: 17
- Agent: 5
- Write: 4
- SendMessage: 4
- Monitor: 1
- Grep: 1

## Tool Result Sizes (bytes)

- count: 95
- sum: 86,856
- p50: 330
- p90: 2,549
- max: 10,786

## File Re-reads

- redundant_read_count: 8
- top paths:
  - 3× C:\work\mega\runner\src\frontend\dashboard\src\pages\ReportsPage.tsx
  - 3× C:\work\mega\runner\src\frontend\dashboard\src\pages\SlicesPage.tsx
  - 2× C:\work\mega\astramemory-local\docs\hardening-roadmap.md
  - 2× C:\work\mega\runner\src\frontend\dashboard\src\pages\AgentsPage.tsx
  - 2× C:\work\mega\runner\src\AstraRunner.Tools.DemoSeed\Personas\SliceCrewWriter.cs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 40 calls, 25,103B results, ~137,970 cache_create tok (5.5×)
- Read: 22 calls, 27,598B results, ~82,688 cache_create tok (3×)
- Edit: 17 calls, 3,010B results, ~54,620 cache_create tok (18.15×)
- Agent: 5 calls, 9,477B results, ~51,186 cache_create tok (5.4×)
- SendMessage: 4 calls, 8,816B results, ~32,872 cache_create tok (3.73×)
- Write: 4 calls, 755B results, ~22,709 cache_create tok (30.08×)
- Grep: 1 calls, 1,102B results, ~4,485 cache_create tok (4.07×)
- Monitor: 1 calls, 209B results, ~2,420 cache_create tok (11.58×)


## By Model (token detail)

### claude-fable-5 (priced as claude-sonnet-4)
- messages: 17
- usd: $3.0202
- input: 1,866
- cache_create_5m: 0
- cache_create_1h: 20,272
- cache_read: 8,821,052
- output: 16,441

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 245
- usd: $217.7343
- input: 31,018
- cache_create_5m: 0
- cache_create_1h: 370,830
- cache_read: 124,928,107
- output: 250,026

