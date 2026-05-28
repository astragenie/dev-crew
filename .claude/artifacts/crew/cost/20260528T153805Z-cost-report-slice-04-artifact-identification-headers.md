---
kind: cost-report
slice: SLICE-04
run_title: "SLICE-04: artifact identification headers"
usd: 530.4209
duration_ms: 34850046
total_tokens: 307829675
cache_hit_pct: 97.5
review_decision: approved_with_notes
source_project: aggregate
aggregate_all: true
source_count: 5
created_at: 2026-05-28T15:38:05.615Z
---

# Cost Report: SLICE-04: artifact identification headers

- Created: 2026-05-28T15:38:05.615Z
- Run Title: SLICE-04: artifact identification headers
- Window Start: 2026-05-28T05:57:13.786Z
- Window End: 2026-05-28T15:38:03.832Z
- Duration: 580.8 min (34850046 ms)
- Sessions Scanned: 7
- Assistant Messages Counted: 1945
- Total Tokens: 307,829,675
- Cache Hit %: 97.5%
- Total USD: $530.4209
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-hero-crew-autonomous-loop: 513 msgs, $262.7930
- C--work-mega-AstraGenie-MemoryService: 549 msgs, $133.5004
- C--work-mega-Astra-Humanizer: 625 msgs, $75.5415
- C--work-mega-Astra-LoopObserver: 76 msgs, $44.4097
- C--work-mega-hero-crew: 182 msgs, $14.1763

## Outcome Linkage

- Slice: SLICE-04
- Grade Avg: -
- Review Decision: approved_with_notes
- Validation Decision: -

## Tokens (totals)

- input: 9,405
- cache_create_5m: 0
- cache_create_1h: 7,679,262
- cache_read: 298,486,901
- output: 1,654,107

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 681 msgs (35.01%), $462.4493 (87.19%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 1264 msgs (64.99%), $67.9716 (12.81%)

## Conversation Shape

- user_msg_count: 81
- user_msg_avg_len: 939
- turns_before_first_tool: 1
- compaction_count: 42
- skill_invocations: 14
- subagent_dispatches: 57

## Tool Usage

- Bash: 527 (28 failed)
- Read: 204 (1 failed)
- Edit: 117 (13 failed)
- Write: 79 (2 failed)
- TaskUpdate: 59
- Agent: 57 (2 failed)
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

- count: 1171
- sum: 1,411,489
- p50: 242
- p90: 2,561
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
- Bash: 526 calls, 479,787B results, ~1,389,026 cache_create tok (2.9×)
- Read: 204 calls, 683,971B results, ~1,098,628 cache_create tok (1.61×)
- AskUserQuestion: 29 calls, 6,901B results, ~995,296 cache_create tok (144.22×)
- ToolSearch: 13 calls, 1,582B results, ~785,319 cache_create tok (496.41×)
- Agent: 56 calls, 154,939B results, ~559,251 cache_create tok (3.61×)
- Write: 79 calls, 14,750B results, ~364,432 cache_create tok (24.71×)
- Skill: 14 calls, 536B results, ~311,391 cache_create tok (580.95×)
- Edit: 117 calls, 21,478B results, ~202,925 cache_create tok (9.45×)
- PowerShell: 15 calls, 19,391B results, ~121,873 cache_create tok (6.29×)
- TaskUpdate: 59 calls, 1,344B results, ~107,051 cache_create tok (79.65×)
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
- messages: 1264
- usd: $67.9716
- input: 2,578
- cache_create_5m: 0
- cache_create_1h: 2,993,264
- cache_read: 127,740,489
- output: 778,809

