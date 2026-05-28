---
kind: cost-report
slice: SLICE-03
run_title: "SLICE-03: agent-report filename timestamp fix"
usd: 529.8974
duration_ms: 34825083
total_tokens: 306421842
cache_hit_pct: 97.5
review_decision: approved_with_notes
source_project: aggregate
aggregate_all: true
source_count: 5
created_at: 2026-05-28T15:37:40.361Z
---

# Cost Report: SLICE-03: agent-report filename timestamp fix

- Created: 2026-05-28T15:37:40.361Z
- Run Title: SLICE-03: agent-report filename timestamp fix
- Window Start: 2026-05-28T05:57:13.786Z
- Window End: 2026-05-28T15:37:38.869Z
- Duration: 580.4 min (34825083 ms)
- Sessions Scanned: 7
- Assistant Messages Counted: 1934
- Total Tokens: 306,421,842
- Cache Hit %: 97.5%
- Total USD: $529.8974
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-hero-crew-autonomous-loop: 510 msgs, $262.6649
- C--work-mega-AstraGenie-MemoryService: 541 msgs, $133.1050
- C--work-mega-Astra-Humanizer: 625 msgs, $75.5415
- C--work-mega-Astra-LoopObserver: 76 msgs, $44.4097
- C--work-mega-hero-crew: 182 msgs, $14.1763

## Outcome Linkage

- Slice: SLICE-03
- Grade Avg: -
- Review Decision: approved_with_notes
- Validation Decision: -

## Tokens (totals)

- input: 9,388
- cache_create_5m: 0
- cache_create_1h: 7,669,400
- cache_read: 297,091,999
- output: 1,651,055

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 681 msgs (35.21%), $462.4493 (87.27%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 1253 msgs (64.79%), $67.4481 (12.73%)

## Conversation Shape

- user_msg_count: 81
- user_msg_avg_len: 939
- turns_before_first_tool: 1
- compaction_count: 42
- skill_invocations: 14
- subagent_dispatches: 57

## Tool Usage

- Bash: 525 (28 failed)
- Read: 204 (1 failed)
- Edit: 115 (13 failed)
- Write: 79 (2 failed)
- Agent: 57 (2 failed)
- TaskUpdate: 57
- AskUserQuestion: 29 (3 failed)
- TaskCreate: 28
- Glob: 19
- PowerShell: 15 (1 failed)
- Skill: 14
- ToolSearch: 13
- Grep: 8
- TaskList: 1
- PushNotification: 1

## Tool Result Sizes (bytes)

- count: 1166
- sum: 1,410,238
- p50: 244
- p90: 2,572
- max: 59,708

## File Re-reads

- redundant_read_count: 57
- top paths:
  - 8× C:\work\mega\Astra.Humanizer\docs\superpowers\plans\2026-05-28-portal-stealth-redesign.md
  - 7× C:\work\mega\Astra.Humanizer\.claude\artifacts\loop\ai-loop\backlog\approved-slices.md
  - 7× C:\work\mega\hero-crew-autonomous-loop\scripts\lib\slice-linker\crew-bridge.mjs
  - 4× C:\work\mega\Astra.Humanizer\.claude\loop.json
  - 4× C:\work\mega\hero-crew-autonomous-loop\scripts\competitor-audit\aggregate.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- TaskCreate: 28 calls, 2,180B results, ~1,524,517 cache_create tok (699.32×)
- Bash: 525 calls, 478,966B results, ~1,315,786 cache_create tok (2.75×)
- Read: 204 calls, 683,971B results, ~1,098,628 cache_create tok (1.61×)
- AskUserQuestion: 29 calls, 6,901B results, ~995,296 cache_create tok (144.22×)
- ToolSearch: 13 calls, 1,582B results, ~785,319 cache_create tok (496.41×)
- Agent: 56 calls, 154,939B results, ~552,123 cache_create tok (3.56×)
- Write: 79 calls, 14,750B results, ~364,432 cache_create tok (24.71×)
- Skill: 14 calls, 536B results, ~311,391 cache_create tok (580.95×)
- Edit: 115 calls, 21,092B results, ~274,383 cache_create tok (13.01×)
- PowerShell: 15 calls, 19,391B results, ~121,873 cache_create tok (6.29×)
- TaskUpdate: 57 calls, 1,300B results, ~106,099 cache_create tok (81.61×)
- Glob: 19 calls, 19,393B results, ~103,094 cache_create tok (5.32×)
- PushNotification: 1 calls, 75B results, ~26,830 cache_create tok (357.73×)
- Grep: 8 calls, 4,629B results, ~18,567 cache_create tok (4.01×)
- TaskList: 1 calls, 14B results, ~922 cache_create tok (65.86×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 681
- usd: $462.4493
- input: 6,827
- cache_create_5m: 0
- cache_create_1h: 4,685,998
- cache_read: 170,746,412
- output: 875,298

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 1253
- usd: $67.4481
- input: 2,561
- cache_create_5m: 0
- cache_create_1h: 2,983,402
- cache_read: 126,345,587
- output: 775,757

