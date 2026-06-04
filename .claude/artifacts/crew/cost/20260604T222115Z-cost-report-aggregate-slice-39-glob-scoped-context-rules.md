---
kind: cost-report
slice: SLICE-39
run_title: "SLICE-39 glob-scoped context rules"
usd: 21.5401
duration_ms: 425299
total_tokens: 15335838
cache_hit_pct: 96.1
review_decision: approved
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-04T22:21:15.718Z
---

# Cost Report: SLICE-39 glob-scoped context rules

- Created: 2026-06-04T22:21:15.718Z
- Run Title: SLICE-39 glob-scoped context rules
- Window Start: 2026-06-04T22:14:08.703Z
- Window End: 2026-06-04T22:21:14.002Z
- Duration: 7.1 min (425299 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 130
- Total Tokens: 15,335,838
- Cache Hit %: 96.1%
- Total USD: $21.5401
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 82 msgs, $16.9965
- C--work-mega-loopobserver: 48 msgs, $4.5437

## Outcome Linkage

- Slice: SLICE-39
- Grade Avg: -
- Review Decision: approved
- Validation Decision: -

## Tokens (totals)

- input: 186
- cache_create_5m: 0
- cache_create_1h: 601,467
- cache_read: 14,645,122
- output: 89,063

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 50 msgs (38.46%), $15.2516 (70.81%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 80 msgs (61.54%), $6.2885 (29.19%)

## Conversation Shape

- user_msg_count: 4
- user_msg_avg_len: 3524
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Read: 17
- Bash: 14
- Edit: 13
- TaskUpdate: 10
- PowerShell: 6
- TaskCreate: 5
- Grep: 5
- ToolSearch: 1
- WebFetch: 1
- Agent: 1

## Tool Result Sizes (bytes)

- count: 75
- sum: 108,300
- p50: 157
- p90: 4,304
- max: 17,888

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\loop\src\tests\loop-installer.test.mts
  - 2× C:\work\mega\loopobserver\src\LoopBrain.Infrastructure\CrewMonitor\Watcher\CrewArtifactWatcher.cs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 17 calls, 81,717B results, ~200,012 cache_create tok (2.45×)
- PowerShell: 7 calls, 2,867B results, ~166,776 cache_create tok (58.17×)
- ToolSearch: 1 calls, 152B results, ~158,976 cache_create tok (1045.89×)
- Edit: 13 calls, 2,280B results, ~30,181 cache_create tok (13.24×)
- TaskUpdate: 10 calls, 220B results, ~13,602 cache_create tok (61.83×)
- Grep: 5 calls, 3,496B results, ~10,778 cache_create tok (3.08×)
- Bash: 14 calls, 3,538B results, ~9,857 cache_create tok (2.79×)
- Agent: 1 calls, 4,304B results, ~6,144 cache_create tok (1.43×)
- WebFetch: 1 calls, 1,110B results, ~1,344 cache_create tok (1.21×)
- TaskCreate: 5 calls, 404B results, ~1,093 cache_create tok (2.71×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 50
- usd: $15.2516
- input: 90
- cache_create_5m: 0
- cache_create_1h: 193,803
- cache_read: 5,300,375
- output: 19,808

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 80
- usd: $6.2885
- input: 96
- cache_create_5m: 0
- cache_create_1h: 407,664
- cache_read: 9,344,747
- output: 69,255

