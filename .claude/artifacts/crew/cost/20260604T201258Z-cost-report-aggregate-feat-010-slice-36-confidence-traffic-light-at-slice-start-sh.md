---
kind: cost-report
slice: SLICE-36
run_title: "FEAT-010 SLICE-36 — confidence traffic-light at slice-start — shipped (AC-5 deferred)"
usd: 846.7829
duration_ms: 11049411
total_tokens: 304462065
cache_hit_pct: 95.9
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-06-04T20:12:58.401Z
---

# Cost Report: FEAT-010 SLICE-36 — confidence traffic-light at slice-start — shipped (AC-5 deferred)

- Created: 2026-06-04T20:12:58.401Z
- Run Title: FEAT-010 SLICE-36 — confidence traffic-light at slice-start — shipped (AC-5 deferred)
- Window Start: 2026-06-04T17:08:47.518Z
- Window End: 2026-06-04T20:12:56.929Z
- Duration: 184.2 min (11049411 ms)
- Sessions Scanned: 7
- Assistant Messages Counted: 535
- Total Tokens: 304,462,065
- Cache Hit %: 95.9%
- Total USD: $846.7829
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 255 msgs, $400.2085
- C--work-mega-loopobserver: 149 msgs, $341.6421
- C--work-mega-hero-crew: 131 msgs, $104.9323

## Outcome Linkage

- Slice: SLICE-36
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 1,014
- cache_create_5m: 0
- cache_create_1h: 12,553,606
- cache_read: 291,468,012
- output: 439,433

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 535 msgs (100%), $846.7829 (100%)

## Conversation Shape

- user_msg_count: 29
- user_msg_avg_len: 90
- turns_before_first_tool: 1
- compaction_count: 13
- skill_invocations: 1
- subagent_dispatches: 11

## Tool Usage

- Bash: 165 (2 failed)
- Read: 49
- Edit: 46 (4 failed)
- TaskUpdate: 13
- Write: 11 (1 failed)
- Agent: 11
- AskUserQuestion: 5
- Grep: 5
- mcp__plugin_playwright_playwright__browser_evaluate: 5
- mcp__plugin_playwright_playwright__browser_navigate: 4
- PowerShell: 3
- mcp__plugin_playwright_playwright__browser_take_screenshot: 3
- mcp__plugin_playwright_playwright__browser_wait_for: 2
- Skill: 1
- Glob: 1

## Tool Result Sizes (bytes)

- count: 325
- sum: 587,899
- p50: 295
- p90: 1,803
- max: 72,780

## File Re-reads

- redundant_read_count: 14
- top paths:
  - 14× C:\work\mega\loop\src\scripts\lib\slice-linker\start-slice.mts
  - 2× C:\work\mega\loopobserver\src\LoopBrain.Web\src\pages\crew-monitor\FleetDetailPage.tsx

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 164 calls, 89,666B results, ~3,825,601 cache_create tok (42.67×)
- AskUserQuestion: 5 calls, 796B results, ~2,458,503 cache_create tok (3088.57×)
- PowerShell: 3 calls, 81B results, ~2,447,784 cache_create tok (30219.56×)
- Write: 11 calls, 1,931B results, ~1,673,563 cache_create tok (866.68×)
- TaskUpdate: 13 calls, 290B results, ~1,485,845 cache_create tok (5123.6×)
- Read: 49 calls, 445,095B results, ~277,925 cache_create tok (0.62×)
- Agent: 11 calls, 27,714B results, ~144,338 cache_create tok (5.21×)
- Edit: 46 calls, 7,855B results, ~75,806 cache_create tok (9.65×)
- Skill: 1 calls, 42B results, ~7,542 cache_create tok (179.57×)
- Grep: 5 calls, 8,111B results, ~4,911 cache_create tok (0.61×)
- mcp__plugin_playwright_playwright__browser_evaluate: 5 calls, 2,190B results, ~2,718 cache_create tok (1.24×)
- mcp__plugin_playwright_playwright__browser_navigate: 4 calls, 1,816B results, ~2,042 cache_create tok (1.12×)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 3 calls, 918B results, ~761 cache_create tok (0.83×)
- mcp__plugin_playwright_playwright__browser_wait_for: 2 calls, 832B results, ~570 cache_create tok (0.69×)
- Glob: 1 calls, 113B results, ~193 cache_create tok (1.71×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 535
- usd: $846.7829
- input: 1,014
- cache_create_5m: 0
- cache_create_1h: 12,553,606
- cache_read: 291,468,012
- output: 439,433

