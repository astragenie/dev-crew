---
kind: cost-report
feature: FEAT-257
run_title: "FEAT257 SLICE159"
usd: 140.1614
duration_ms: 3131100
total_tokens: 65932310
cache_hit_pct: 98.9
source_project: aggregate
aggregate_all: true
source_count: 4
created_at: 2026-07-10T19:10:59.867Z
---

# Cost Report: FEAT257 SLICE159

- Created: 2026-07-10T19:10:59.867Z
- Run Title: FEAT257 SLICE159
- Window Start: 2026-07-10T18:18:33.283Z
- Window End: 2026-07-10T19:10:44.383Z
- Duration: 52.2 min (3131100 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 269
- Total Tokens: 65,932,310
- Cache Hit %: 98.9%
- Total USD: $140.1614
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-dev-team: 138 msgs, $76.5624
- C--work-mega-runner-plugin: 55 msgs, $31.9857
- C--work-mega-memory: 51 msgs, $25.2583
- C--work-mega-astramemory-plugin: 25 msgs, $6.3551

## Tokens (totals)

- input: 51,589
- cache_create_5m: 0
- cache_create_1h: 675,634
- cache_read: 64,915,143
- output: 289,944

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 269 msgs (100%), $140.1614 (100%)

## Conversation Shape

- user_msg_count: 6
- user_msg_avg_len: 1318
- turns_before_first_tool: 2
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 6

## Tool Usage

- Bash: 69 (1 failed)
- Edit: 9
- Read: 7
- Write: 6
- Agent: 6
- ToolSearch: 2
- SendMessage: 2
- AskUserQuestion: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 104
- sum: 119,674
- p50: 425
- p90: 3,192
- max: 9,112

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\dev-team\tests\validate-syntheses.test.ts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 68 calls, 65,380B results, ~312,552 cache_create tok (4.78×)
- ToolSearch: 2 calls, 106B results, ~161,971 cache_create tok (1528.03×)
- Agent: 6 calls, 17,932B results, ~69,090 cache_create tok (3.85×)
- Read: 7 calls, 21,325B results, ~31,286 cache_create tok (1.47×)
- SendMessage: 2 calls, 845B results, ~29,524 cache_create tok (34.94×)
- Edit: 9 calls, 1,502B results, ~26,203 cache_create tok (17.45×)
- Write: 6 calls, 1,276B results, ~23,309 cache_create tok (18.27×)
- Skill: 1 calls, 29B results, ~15,054 cache_create tok (519.1×)
- AskUserQuestion: 1 calls, 180B results, ~3,627 cache_create tok (20.15×)


## By Model (token detail)

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 269
- usd: $140.1614
- input: 51,589
- cache_create_5m: 0
- cache_create_1h: 675,634
- cache_read: 64,915,143
- output: 289,944

