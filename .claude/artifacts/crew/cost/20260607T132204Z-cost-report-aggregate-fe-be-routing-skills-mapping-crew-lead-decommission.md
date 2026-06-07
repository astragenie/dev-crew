---
kind: cost-report
run_title: "FE/BE routing + skills mapping + crew:lead decommission"
usd: 42.4587
duration_ms: 536989
total_tokens: 22338301
cache_hit_pct: 99.0
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-06-07T13:22:04.943Z
---

# Cost Report: FE/BE routing + skills mapping + crew:lead decommission

- Created: 2026-06-07T13:22:04.943Z
- Run Title: FE/BE routing + skills mapping + crew:lead decommission
- Window Start: 2026-06-07T13:13:02.083Z
- Window End: 2026-06-07T13:21:59.072Z
- Duration: 8.9 min (536989 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 127
- Total Tokens: 22,338,301
- Cache Hit %: 99.0%
- Total USD: $42.4587
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 96 msgs, $27.2822
- C--work-mega-loopobserver: 23 msgs, $14.6556
- C--work-mega-hero-crew: 8 msgs, $0.5210

## Tokens (totals)

- input: 291
- cache_create_5m: 0
- cache_create_1h: 225,257
- cache_read: 22,030,246
- output: 82,507

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 110 msgs (86.61%), $41.5745 (97.92%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 17 msgs (13.39%), $0.8842 (2.08%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 1
- skill_invocations: 1
- subagent_dispatches: 5

## Tool Usage

- Edit: 20 (1 failed)
- TaskUpdate: 17
- Bash: 14
- Read: 12
- Grep: 8
- Agent: 5
- Glob: 5
- Write: 4 (1 failed)
- AskUserQuestion: 2
- ToolSearch: 1
- Skill: 1

## Tool Result Sizes (bytes)

- count: 86
- sum: 92,647
- p50: 186
- p90: 2,737
- max: 16,817

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\.claude\worktrees\fe-be-routing-fix\src\tests\slice-classify.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 12 calls, 39,294B results, ~56,170 cache_create tok (1.43×)
- Grep: 8 calls, 32,352B results, ~36,607 cache_create tok (1.13×)
- TaskUpdate: 16 calls, 364B results, ~36,308 cache_create tok (99.75×)
- Edit: 20 calls, 3,712B results, ~25,954 cache_create tok (6.99×)
- Bash: 13 calls, 10,424B results, ~23,574 cache_create tok (2.26×)
- Agent: 2 calls, 4,514B results, ~18,015 cache_create tok (3.99×)
- Glob: 5 calls, 386B results, ~11,671 cache_create tok (30.24×)
- Write: 4 calls, 870B results, ~9,394 cache_create tok (10.8×)
- ToolSearch: 1 calls, 52B results, ~2,618 cache_create tok (50.35×)
- AskUserQuestion: 2 calls, 342B results, ~2,490 cache_create tok (7.28×)
- Skill: 1 calls, 32B results, ~1,954 cache_create tok (61.06×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 17
- usd: $0.8842
- input: 23
- cache_create_5m: 0
- cache_create_1h: 13,734
- cache_read: 2,052,144
- output: 12,405

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 110
- usd: $41.5745
- input: 268
- cache_create_5m: 0
- cache_create_1h: 211,523
- cache_read: 19,978,102
- output: 70,102

