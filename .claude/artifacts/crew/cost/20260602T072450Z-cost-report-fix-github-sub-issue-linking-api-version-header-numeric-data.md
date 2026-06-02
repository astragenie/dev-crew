---
kind: cost-report
run_title: "fix: GitHub sub-issue linking — API version header + numeric database id"
usd: 1351.5528
duration_ms: 291528807
total_tokens: 2404426424
cache_hit_pct: 98.4
source_project: aggregate
aggregate_all: true
source_count: 13
created_at: 2026-06-02T07:24:50.839Z
---

# Cost Report: fix: GitHub sub-issue linking — API version header + numeric database id

- Created: 2026-06-02T07:24:50.839Z
- Run Title: fix: GitHub sub-issue linking — API version header + numeric database id
- Window Start: 2026-05-29T22:25:53.235Z
- Window End: 2026-06-02T07:24:42.042Z
- Duration: 4858.8 min (291528807 ms)
- Sessions Scanned: 87
- Assistant Messages Counted: 8547
- Total Tokens: 2,404,426,424
- Cache Hit %: 98.4%
- Total USD: $1351.5528
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-common: 2670 msgs, $485.8714
- C--work-mega-AstraGenie-MemoryService: 2102 msgs, $366.3614
- C--work-mega-tools: 1393 msgs, $193.8913
- C--work-mega-loop: 930 msgs, $100.4977
- C--work-mega-devops: 347 msgs, $95.7938
- C--work-mega-loopobserver: 753 msgs, $66.7618
- C--work-mega-authentic: 108 msgs, $14.9676
- C--work-mega-common--claude-worktrees-p0-security-hotfixes: 34 msgs, $8.8838
- C--work-mega-common--claude-worktrees-aspire-meta-orchestrator: 36 msgs, $6.6295
- C--work-mega-hero-crew: 74 msgs, $6.2950
- C--work-mega-raskraska: 58 msgs, $2.5191
- C--work-mega-common--claude-worktrees-feat-007-servicedefaults: 17 msgs, $1.9249
- C--work-mega: 25 msgs, $1.1555

## Tokens (totals)

- input: 139,599
- cache_create_5m: 4,935,369
- cache_create_1h: 34,464,392
- cache_read: 2,359,627,481
- output: 5,259,583

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 7524 msgs (88.03%), $927.7303 (68.64%)
- claude-opus-4-8 (priced as claude-opus-4): 202 msgs (2.36%), $231.2075 (17.11%)
- claude-opus-4-7 (priced as claude-opus-4): 821 msgs (9.61%), $192.6150 (14.25%)

## Conversation Shape

- user_msg_count: 354
- user_msg_avg_len: 3180
- turns_before_first_tool: 2
- compaction_count: 104
- skill_invocations: 50
- subagent_dispatches: 80

## Tool Usage

- Bash: 1509 (75 failed)
- Read: 780 (84 failed)
- Edit: 300 (16 failed)
- PowerShell: 246 (62 failed)
- Write: 212 (9 failed)
- Grep: 97
- Glob: 97
- Agent: 80
- TaskUpdate: 78
- StructuredOutput: 66
- Skill: 50
- mcp__plugin_playwright_playwright__browser_navigate: 36 (6 failed)
- TaskCreate: 33
- mcp__plugin_playwright_playwright__browser_take_screenshot: 28
- ToolSearch: 22
- Monitor: 20
- mcp__plugin_playwright_playwright__browser_snapshot: 13 (1 failed)
- mcp__plugin_playwright_playwright__browser_click: 11 (6 failed)
- EnterWorktree: 3
- ExitWorktree: 3 (1 failed)
- Workflow: 3
- ScheduleWakeup: 3
- mcp__plugin_azure_azure__containerapps: 2 (1 failed)
- EnterPlanMode: 1
- AskUserQuestion: 1
- ExitPlanMode: 1
- mcp__plugin_playwright_playwright__browser_fill_form: 1

## Tool Result Sizes (bytes)

- count: 3697
- sum: 6,578,129
- p50: 225
- p90: 2,615
- max: 194,571

## File Re-reads

- redundant_read_count: 315
- top paths:
  - 11× C:\work\mega\loop\scripts\lib\github-sync\gh.mjs
  - 10× C:\work\mega\AstraGenie.MemoryService\src\MemoryService.Infrastructure\ServiceCollectionExtensions.cs
  - 9× C:\work\mega\loop\scripts\lib\github-sync.mjs
  - 9× C:\work\mega\loop\scripts\lib\github-sync\issue-sync.mjs
  - 9× C:\work\mega\loop\scripts\lib\slice-linker\start-slice.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 1508 calls, 1,054,658B results, ~20,268,202 cache_create tok (19.22×)
- Read: 762 calls, 2,618,102B results, ~4,865,692 cache_create tok (1.86×)
- PowerShell: 245 calls, 149,644B results, ~3,199,764 cache_create tok (21.38×)
- StructuredOutput: 64 calls, 2,496B results, ~2,335,108 cache_create tok (935.54×)
- Write: 211 calls, 38,039B results, ~1,758,502 cache_create tok (46.23×)
- Agent: 79 calls, 167,677B results, ~1,633,510 cache_create tok (9.74×)
- Edit: 300 calls, 55,029B results, ~1,487,103 cache_create tok (27.02×)
- ExitWorktree: 3 calls, 593B results, ~1,026,199 cache_create tok (1730.52×)
- Workflow: 3 calls, 3,760B results, ~846,604 cache_create tok (225.16×)
- Grep: 97 calls, 129,137B results, ~550,768 cache_create tok (4.26×)
- TaskCreate: 33 calls, 2,311B results, ~408,045 cache_create tok (176.57×)
- Skill: 50 calls, 1,873B results, ~236,376 cache_create tok (126.2×)
- Glob: 96 calls, 45,687B results, ~176,405 cache_create tok (3.86×)
- TaskUpdate: 76 calls, 1,657B results, ~166,795 cache_create tok (100.66×)
- mcp__plugin_playwright_playwright__browser_take_screenshot: 28 calls, 2,129,461B results, ~101,472 cache_create tok (0.05×)
- ToolSearch: 22 calls, 3,029B results, ~72,831 cache_create tok (24.04×)
- mcp__plugin_playwright_playwright__browser_snapshot: 13 calls, 61,640B results, ~53,276 cache_create tok (0.86×)
- Monitor: 20 calls, 4,153B results, ~43,485 cache_create tok (10.47×)
- mcp__plugin_playwright_playwright__browser_navigate: 36 calls, 12,009B results, ~25,573 cache_create tok (2.13×)
- mcp__plugin_playwright_playwright__browser_click: 11 calls, 2,509B results, ~11,034 cache_create tok (4.4×)
- ExitPlanMode: 1 calls, 8,323B results, ~8,649 cache_create tok (1.04×)
- EnterPlanMode: 1 calls, 581B results, ~4,287 cache_create tok (7.38×)
- ScheduleWakeup: 3 calls, 471B results, ~3,275 cache_create tok (6.95×)
- mcp__plugin_azure_azure__containerapps: 2 calls, 6,042B results, ~2,984 cache_create tok (0.49×)
- EnterWorktree: 3 calls, 730B results, ~2,655 cache_create tok (3.64×)
- mcp__plugin_playwright_playwright__browser_fill_form: 1 calls, 436B results, ~2,144 cache_create tok (4.92×)
- AskUserQuestion: 1 calls, 290B results, ~1,725 cache_create tok (5.95×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 7524
- usd: $927.7303
- input: 93,109
- cache_create_5m: 0
- cache_create_1h: 31,546,261
- cache_read: 2,250,540,258
- output: 4,200,753

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 821
- usd: $192.6150
- input: 1,691
- cache_create_5m: 4,935,369
- cache_create_1h: 0
- cache_read: 26,001,839
- output: 813,983

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 202
- usd: $231.2075
- input: 44,799
- cache_create_5m: 0
- cache_create_1h: 2,918,131
- cache_read: 83,085,384
- output: 244,847

