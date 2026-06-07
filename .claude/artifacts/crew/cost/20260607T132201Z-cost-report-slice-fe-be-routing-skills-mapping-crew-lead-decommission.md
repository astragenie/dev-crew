---
kind: cost-report
run_title: "FE/BE routing + skills mapping + crew:lead decommission"
usd: 26.9148
duration_ms: 536989
total_tokens: 12668568
cache_hit_pct: 98.5
source_project: C--work-mega-loop
auto_detected: true
aggregate_all: false
source_count: 1
created_at: 2026-06-07T13:22:01.677Z
---

# Cost Report: FE/BE routing + skills mapping + crew:lead decommission

- Created: 2026-06-07T13:22:01.677Z
- Run Title: FE/BE routing + skills mapping + crew:lead decommission
- Window Start: 2026-06-07T13:13:02.083Z
- Window End: 2026-06-07T13:21:59.072Z
- Duration: 8.9 min (536989 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 95
- Total Tokens: 12,668,568
- Cache Hit %: 98.5%
- Total USD: $26.9148
- Source Project: C--work-mega-loop
- Auto-detected: yes
- Aggregate All: no

## Tokens (totals)

- input: 249
- cache_create_5m: 0
- cache_create_1h: 192,825
- cache_read: 12,422,896
- output: 52,598

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 86 msgs (90.53%), $26.5515 (98.65%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 9 msgs (9.47%), $0.3632 (1.35%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Edit: 19 (1 failed)
- TaskUpdate: 17
- Read: 10
- Bash: 9
- Grep: 8
- Glob: 5
- Write: 1
- ToolSearch: 1
- Agent: 1

## Tool Result Sizes (bytes)

- count: 71
- sum: 83,782
- p50: 180
- p90: 2,737
- max: 16,817

## File Re-reads

- redundant_read_count: 1
- top paths:
  - 2× C:\work\mega\loop\.claude\worktrees\fe-be-routing-fix\src\tests\slice-classify.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 10 calls, 38,883B results, ~54,730 cache_create tok (1.41×)
- Grep: 8 calls, 32,352B results, ~36,607 cache_create tok (1.13×)
- TaskUpdate: 16 calls, 364B results, ~36,308 cache_create tok (99.75×)
- Edit: 19 calls, 3,443B results, ~24,730 cache_create tok (7.18×)
- Bash: 9 calls, 7,761B results, ~14,366 cache_create tok (1.85×)
- Glob: 5 calls, 386B results, ~11,671 cache_create tok (30.24×)
- ToolSearch: 1 calls, 52B results, ~2,618 cache_create tok (50.35×)
- Write: 1 calls, 236B results, ~1,664 cache_create tok (7.05×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 86
- usd: $26.5515
- input: 234
- cache_create_5m: 0
- cache_create_1h: 186,946
- cache_read: 11,669,906
- output: 45,797

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 9
- usd: $0.3632
- input: 15
- cache_create_5m: 0
- cache_create_1h: 5,879
- cache_read: 752,990
- output: 6,801

