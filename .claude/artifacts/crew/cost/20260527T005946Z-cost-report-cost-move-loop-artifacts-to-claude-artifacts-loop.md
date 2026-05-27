---
kind: cost-report
run_title: "Move loop artifacts to .claude/artifacts/loop/"
usd: 160.275
duration_ms: 1397575
total_tokens: 63416999
cache_hit_pct: 95.6
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-05-27T00:59:46.133Z
---

# Cost Report: Cost — Move loop artifacts to .claude/artifacts/loop/

- Created: 2026-05-27T00:59:46.133Z
- Run Title: Move loop artifacts to .claude/artifacts/loop/
- Window Start: 2026-05-27T00:36:27.868Z
- Window End: 2026-05-27T00:59:45.443Z
- Duration: 23.3 min (1397575 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 451
- Total Tokens: 63,416,999
- Cache Hit %: 95.6%
- Total USD: $160.2750
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-hero-crew-autonomous-loop: 294 msgs, $136.6421
- C--work-mega-Astra-Humanizer: 91 msgs, $18.5506
- C--work-mega-AstraGenie-MemoryService: 66 msgs, $5.0823

## Tokens (totals)

- input: 5,041
- cache_create_5m: 0
- cache_create_1h: 2,754,891
- cache_read: 60,394,944
- output: 262,123

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 355 msgs (78.71%), $152.1003 (94.9%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 96 msgs (21.29%), $8.1747 (5.1%)

## Conversation Shape

- user_msg_count: 15
- user_msg_avg_len: 552
- turns_before_first_tool: 1
- compaction_count: 9
- skill_invocations: 2
- subagent_dispatches: 6

## Tool Usage

- Read: 75 (1 failed)
- Edit: 70 (11 failed)
- Bash: 48 (1 failed)
- Grep: 22
- TaskUpdate: 16
- PowerShell: 11
- TaskCreate: 8
- ToolSearch: 7
- WebFetch: 7
- Write: 6
- Agent: 6
- mcp__northstar__plan_next_artifact_generation: 3 (3 failed)
- mcp__northstar__create_product_plan: 2
- mcp__northstar__run_custom_analysis: 2
- mcp__northstar__submit_artifact_clarifications: 2 (2 failed)
- Skill: 2
- Glob: 2
- mcp__northstar__create_artifact_from_template: 1 (1 failed)
- mcp__northstar__get_product_context: 1

## Tool Result Sizes (bytes)

- count: 291
- sum: 356,105
- p50: 215
- p90: 2,519
- max: 41,073

## File Re-reads

- redundant_read_count: 24
- top paths:
  - 6× C:\work\mega\hero-crew-autonomous-loop\scripts\lib\slice-linker\slice-progress.mjs
  - 5× C:\Users\serge\.claude\projects\C--work-mega-AstraGenie-MemoryService\b181a76c-ce3f-4c32-9110-a83c054318b0\tool-results\bmfcwtuvt.txt
  - 5× C:\work\mega\hero-crew-autonomous-loop\scripts\lib\slice-linker.mjs
  - 4× C:\work\mega\hero-crew-autonomous-loop\scripts\lib\slice-linker\crew-bridge.mjs
  - 3× C:\work\mega\hero-crew-autonomous-loop\scripts\lib\release-planner.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Read: 75 calls, 247,856B results, ~1,278,977 cache_create tok (5.16×)
- Edit: 70 calls, 11,733B results, ~798,196 cache_create tok (68.03×)
- Bash: 48 calls, 33,273B results, ~323,459 cache_create tok (9.72×)
- Agent: 4 calls, 13,334B results, ~219,064 cache_create tok (16.43×)
- Write: 6 calls, 1,039B results, ~22,823 cache_create tok (21.97×)
- Grep: 22 calls, 14,360B results, ~21,409 cache_create tok (1.49×)
- PowerShell: 11 calls, 8,440B results, ~14,198 cache_create tok (1.68×)
- mcp__northstar__submit_artifact_clarifications: 2 calls, 168B results, ~13,901 cache_create tok (82.74×)
- TaskUpdate: 16 calls, 352B results, ~13,776 cache_create tok (39.14×)
- WebFetch: 7 calls, 14,252B results, ~13,680 cache_create tok (0.96×)
- ToolSearch: 7 calls, 645B results, ~10,804 cache_create tok (16.75×)
- TaskCreate: 8 calls, 579B results, ~10,497 cache_create tok (18.13×)
- mcp__northstar__create_product_plan: 2 calls, 3,391B results, ~3,486 cache_create tok (1.03×)
- mcp__northstar__get_product_context: 1 calls, 4,131B results, ~2,566 cache_create tok (0.62×)
- mcp__northstar__plan_next_artifact_generation: 3 calls, 342B results, ~1,912 cache_create tok (5.59×)
- Skill: 2 calls, 66B results, ~1,696 cache_create tok (25.7×)
- mcp__northstar__run_custom_analysis: 2 calls, 1,514B results, ~1,658 cache_create tok (1.1×)
- mcp__northstar__create_artifact_from_template: 1 calls, 99B results, ~828 cache_create tok (8.36×)
- Glob: 2 calls, 122B results, ~795 cache_create tok (6.52×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 355
- usd: $152.1003
- input: 1,108
- cache_create_5m: 0
- cache_create_1h: 2,140,591
- cache_read: 49,273,048
- output: 186,085

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 96
- usd: $8.1747
- input: 3,933
- cache_create_5m: 0
- cache_create_1h: 614,300
- cache_read: 11,121,896
- output: 76,038

