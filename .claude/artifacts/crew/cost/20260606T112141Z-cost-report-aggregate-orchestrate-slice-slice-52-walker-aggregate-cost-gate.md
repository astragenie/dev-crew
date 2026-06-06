---
kind: cost-report
slice: SLICE-52
run_title: "orchestrate-slice: SLICE-52 Walker aggregate cost gate"
usd: 149.515
duration_ms: 1764146
total_tokens: 70197032
cache_hit_pct: 98.0
review_decision: approved_with_notes
validation_decision: passed_with_notes
source_project: aggregate
aggregate_all: true
source_count: 5
created_at: 2026-06-06T11:21:41.343Z
---

# Cost Report: orchestrate-slice: SLICE-52 Walker aggregate cost gate

- Created: 2026-06-06T11:21:41.343Z
- Run Title: orchestrate-slice: SLICE-52 Walker aggregate cost gate
- Window Start: 2026-06-06T10:52:14.391Z
- Window End: 2026-06-06T11:21:38.537Z
- Duration: 29.4 min (1764146 ms)
- Sessions Scanned: 5
- Assistant Messages Counted: 367
- Total Tokens: 70,197,032
- Cache Hit %: 98.0%
- Total USD: $149.5150
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loopobserver: 144 msgs, $69.2467
- C--work-mega-hero-crew: 89 msgs, $39.6561
- C--work-mega-loop: 83 msgs, $36.9637
- C--work-mega-authentic: 36 msgs, $2.7933
- C--work-mega-cortex: 15 msgs, $0.8552

## Outcome Linkage

- Slice: SLICE-52
- Grade Avg: -
- Review Decision: approved_with_notes
- Validation Decision: passed_with_notes

## Tokens (totals)

- input: 869
- cache_create_5m: 0
- cache_create_1h: 1,419,422
- cache_read: 68,527,108
- output: 249,633

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 316 msgs (86.1%), $145.8665 (97.56%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 51 msgs (13.9%), $3.6485 (2.44%)

## Conversation Shape

- user_msg_count: 28
- user_msg_avg_len: 636
- turns_before_first_tool: 6
- compaction_count: 24
- skill_invocations: 2
- subagent_dispatches: 12

## Tool Usage

- Bash: 78 (6 failed)
- Read: 19
- TaskUpdate: 14
- Edit: 14
- Agent: 12
- Grep: 11 (1 failed)
- TaskCreate: 9
- Glob: 8
- Write: 7
- AskUserQuestion: 5
- ToolSearch: 3
- Skill: 2

## Tool Result Sizes (bytes)

- count: 184
- sum: 179,260
- p50: 194
- p90: 2,164
- max: 16,545

## File Re-reads

- redundant_read_count: 5
- top paths:
  - 3× C:\work\mega\loopobserver\src\LoopBrain.Web\src\pages\crew-monitor\CostTrendsPage.tsx
  - 3× C:\work\mega\loopobserver\src\LoopBrain.Web\src\components\charts\DailyTokenSpendBar.tsx
  - 2× C:\work\mega\loopobserver\src\LoopBrain.Web\src\pages\crew-monitor\FleetDetailPage.tsx

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- TaskCreate: 9 calls, 460B results, ~559,862 cache_create tok (1217.09×)
- Bash: 78 calls, 43,495B results, ~423,502 cache_create tok (9.74×)
- Read: 19 calls, 103,066B results, ~103,430 cache_create tok (1×)
- ToolSearch: 3 calls, 156B results, ~85,262 cache_create tok (546.55×)
- Agent: 12 calls, 19,752B results, ~59,113 cache_create tok (2.99×)
- Glob: 8 calls, 356B results, ~57,912 cache_create tok (162.67×)
- Edit: 14 calls, 2,503B results, ~33,730 cache_create tok (13.48×)
- Write: 7 calls, 1,342B results, ~30,223 cache_create tok (22.52×)
- TaskUpdate: 14 calls, 308B results, ~25,921 cache_create tok (84.16×)
- Skill: 2 calls, 81B results, ~22,242 cache_create tok (274.59×)
- AskUserQuestion: 5 calls, 1,300B results, ~10,491 cache_create tok (8.07×)
- Grep: 11 calls, 1,904B results, ~6,213 cache_create tok (3.26×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 51
- usd: $3.6485
- input: 160
- cache_create_5m: 0
- cache_create_1h: 267,339
- cache_read: 5,300,873
- output: 30,246

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 316
- usd: $145.8665
- input: 709
- cache_create_5m: 0
- cache_create_1h: 1,152,083
- cache_read: 63,226,235
- output: 219,387

