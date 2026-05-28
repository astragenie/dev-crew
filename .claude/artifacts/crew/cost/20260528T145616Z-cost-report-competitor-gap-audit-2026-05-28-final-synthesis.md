---
kind: cost-report
run_title: "Competitor gap audit 2026-05-28 — final synthesis"
usd: 485.3237
duration_ms: 32341181
total_tokens: 231964750
cache_hit_pct: 97.3
source_project: aggregate
aggregate_all: true
source_count: 4
created_at: 2026-05-28T14:56:16.351Z
---

# Cost Report: Competitor gap audit 2026-05-28 — final synthesis

- Created: 2026-05-28T14:56:16.351Z
- Run Title: Competitor gap audit 2026-05-28 — final synthesis
- Window Start: 2026-05-28T05:57:13.786Z
- Window End: 2026-05-28T14:56:14.967Z
- Duration: 539.0 min (32341181 ms)
- Sessions Scanned: 5
- Assistant Messages Counted: 1231
- Total Tokens: 231,964,750
- Cache Hit %: 97.3%
- Total USD: $485.3237
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-hero-crew-autonomous-loop: 361 msgs, $253.6320
- C--work-mega-AstraGenie-MemoryService: 369 msgs, $120.5670
- C--work-mega-Astra-Humanizer: 425 msgs, $66.7151
- C--work-mega-Astra-LoopObserver: 76 msgs, $44.4097

## Tokens (totals)

- input: 7,511
- cache_create_5m: 0
- cache_create_1h: 6,177,616
- cache_read: 224,498,867
- output: 1,280,756

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 664 msgs (53.94%), $452.0931 (93.15%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 567 msgs (46.06%), $33.2306 (6.85%)

## Conversation Shape

- user_msg_count: 52
- user_msg_avg_len: 832
- turns_before_first_tool: 1
- compaction_count: 24
- skill_invocations: 10
- subagent_dispatches: 43

## Tool Usage

- Bash: 305 (15 failed)
- Read: 101 (1 failed)
- Edit: 74 (6 failed)
- Write: 52 (2 failed)
- TaskUpdate: 49
- Agent: 43 (2 failed)
- AskUserQuestion: 26 (3 failed)
- TaskCreate: 23
- ToolSearch: 12
- PowerShell: 11 (1 failed)
- Skill: 10
- Glob: 9
- Grep: 4
- TaskList: 1
- PushNotification: 1

## Tool Result Sizes (bytes)

- count: 723
- sum: 720,270
- p50: 215
- p90: 2,349
- max: 44,027

## File Re-reads

- redundant_read_count: 23
- top paths:
  - 4× C:\work\mega\Astra.Humanizer\.claude\artifacts\loop\ai-loop\backlog\approved-slices.md
  - 4× C:\work\mega\hero-crew-autonomous-loop\scripts\competitor-audit\aggregate.mjs
  - 3× C:\work\mega\Astra.Humanizer\.claude\loop.json
  - 3× C:\work\mega\Astra.Humanizer\src\Astra.Humanizer.Api\Program.cs
  - 3× C:\work\mega\hero-crew-autonomous-loop\scripts\lib\slice-linker\crew-bridge.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- TaskCreate: 23 calls, 1,730B results, ~1,523,587 cache_create tok (880.69×)
- AskUserQuestion: 26 calls, 6,463B results, ~991,750 cache_create tok (153.45×)
- ToolSearch: 12 calls, 1,479B results, ~781,441 cache_create tok (528.36×)
- Bash: 305 calls, 236,644B results, ~763,703 cache_create tok (3.23×)
- Read: 101 calls, 315,011B results, ~569,012 cache_create tok (1.81×)
- Agent: 43 calls, 117,723B results, ~390,332 cache_create tok (3.32×)
- Write: 52 calls, 9,572B results, ~311,212 cache_create tok (32.51×)
- Skill: 10 calls, 420B results, ~303,967 cache_create tok (723.73×)
- Edit: 74 calls, 14,105B results, ~160,197 cache_create tok (11.36×)
- PowerShell: 11 calls, 8,249B results, ~111,150 cache_create tok (13.47×)
- TaskUpdate: 49 calls, 1,124B results, ~91,723 cache_create tok (81.6×)
- Glob: 9 calls, 5,889B results, ~69,647 cache_create tok (11.83×)
- PushNotification: 1 calls, 75B results, ~26,830 cache_create tok (357.73×)
- Grep: 4 calls, 1,253B results, ~12,003 cache_create tok (9.58×)
- TaskList: 1 calls, 14B results, ~922 cache_create tok (65.86×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 664
- usd: $452.0931
- input: 6,784
- cache_create_5m: 0
- cache_create_1h: 4,427,429
- cache_read: 169,783,692
- output: 859,906

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 567
- usd: $33.2306
- input: 727
- cache_create_5m: 0
- cache_create_1h: 1,750,187
- cache_read: 54,715,175
- output: 420,850

