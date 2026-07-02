---
kind: cost-report
feature: FEAT-202
run_title: "FEAT202 SLICE134"
usd: 151.8816
duration_ms: 762794
total_tokens: 65102145
cache_hit_pct: 98.2
source_project: aggregate
aggregate_all: true
source_count: 6
created_at: 2026-07-01T22:39:55.857Z
---

# Cost Report: FEAT202 SLICE134

- Created: 2026-07-01T22:39:55.857Z
- Run Title: FEAT202 SLICE134
- Window Start: 2026-07-01T22:27:04.096Z
- Window End: 2026-07-01T22:39:46.890Z
- Duration: 12.7 min (762794 ms)
- Sessions Scanned: 7
- Assistant Messages Counted: 279
- Total Tokens: 65,102,145
- Cache Hit %: 98.2%
- Total USD: $151.8816
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-runner: 132 msgs, $77.7231
- C--work-mega-devops: 79 msgs, $35.0544
- C--work-mega-memory--claude-worktrees-cleanup: 21 msgs, $20.6139
- C--work-mega-dev-team: 16 msgs, $8.2383
- C--work-mega-runner-plugin: 21 msgs, $7.4144
- C--work-mega-sales: 10 msgs, $2.8375

## Tokens (totals)

- input: 725
- cache_create_5m: 0
- cache_create_1h: 1,197,168
- cache_read: 63,630,792
- output: 273,460

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 279 msgs (100%), $151.8816 (100%)

## Conversation Shape

- user_msg_count: 12
- user_msg_avg_len: 368
- turns_before_first_tool: 0
- compaction_count: 1
- skill_invocations: 0
- subagent_dispatches: 9

## Tool Usage

- Bash: 71 (1 failed)
- Read: 19
- Edit: 15
- TaskUpdate: 14
- Agent: 9
- TaskCreate: 8
- Grep: 7
- Write: 7 (1 failed)
- PowerShell: 6 (1 failed)
- Glob: 5
- TaskStop: 4
- ToolSearch: 3
- WebSearch: 2
- ScheduleWakeup: 1
- TaskList: 1
- AskUserQuestion: 1

## Tool Result Sizes (bytes)

- count: 173
- sum: 124,649
- p50: 169
- p90: 1,814
- max: 11,911

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 2× C:\work\mega\memory\src\frontend\marketing\package.json
  - 2× C:\work\mega\memory\src\frontend\marketing\vite.config.ts
  - 2× C:\work\mega\runner-plugin\src\scripts\lib\dispatch-worktree.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- TaskCreate: 8 calls, 718B results, ~603,762 cache_create tok (840.89×)
- Bash: 70 calls, 25,307B results, ~351,106 cache_create tok (13.87×)
- Agent: 8 calls, 11,528B results, ~68,613 cache_create tok (5.95×)
- Read: 19 calls, 48,460B results, ~47,991 cache_create tok (0.99×)
- Edit: 15 calls, 2,559B results, ~35,350 cache_create tok (13.81×)
- Write: 7 calls, 1,111B results, ~17,411 cache_create tok (15.67×)
- TaskUpdate: 14 calls, 328B results, ~16,699 cache_create tok (50.91×)
- Grep: 7 calls, 11,825B results, ~15,260 cache_create tok (1.29×)
- TaskStop: 4 calls, 798B results, ~12,516 cache_create tok (15.68×)
- ToolSearch: 3 calls, 253B results, ~6,245 cache_create tok (24.68×)
- PowerShell: 6 calls, 2,294B results, ~6,006 cache_create tok (2.62×)
- WebSearch: 2 calls, 5,424B results, ~5,500 cache_create tok (1.01×)
- Glob: 5 calls, 1,125B results, ~3,719 cache_create tok (3.31×)
- AskUserQuestion: 1 calls, 256B results, ~3,612 cache_create tok (14.11×)
- TaskList: 1 calls, 14B results, ~1,422 cache_create tok (101.57×)
- ScheduleWakeup: 1 calls, 156B results, ~1,375 cache_create tok (8.81×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 279
- usd: $151.8816
- input: 725
- cache_create_5m: 0
- cache_create_1h: 1,197,168
- cache_read: 63,630,792
- output: 273,460

