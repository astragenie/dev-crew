---
kind: cost-report
run_title: "FEAT-006 complete — --summary flag, ceremony pre-check, Gap 3 resolved"
usd: 75.9134
duration_ms: 603828
total_tokens: 61282034
cache_hit_pct: 98.7
source_project: aggregate
aggregate_all: true
source_count: 7
created_at: 2026-05-29T22:36:05.272Z
---

# Cost Report: FEAT-006 complete — --summary flag, ceremony pre-check, Gap 3 resolved

- Created: 2026-05-29T22:36:05.272Z
- Run Title: FEAT-006 complete — --summary flag, ceremony pre-check, Gap 3 resolved
- Window Start: 2026-05-29T22:25:53.235Z
- Window End: 2026-05-29T22:35:57.063Z
- Duration: 10.1 min (603828 ms)
- Sessions Scanned: 13
- Assistant Messages Counted: 248
- Total Tokens: 61,282,034
- Cache Hit %: 98.7%
- Total USD: $75.9134
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-devops: 44 msgs, $37.4138
- C--work-mega-tools: 31 msgs, $18.6337
- C--work-mega-AstraGenie-MemoryService: 67 msgs, $10.5496
- C--work-mega-hero-crew: 57 msgs, $5.3015
- C--work-mega-authentic: 40 msgs, $3.6333
- C--work-mega-loop: 8 msgs, $0.2943
- C--work-mega-loopobserver: 1 msgs, $0.0872

## Tokens (totals)

- input: 25,215
- cache_create_5m: 208,691
- cache_create_1h: 586,002
- cache_read: 60,268,302
- output: 193,824

## Model Mix

- claude-opus-4-8 (priced as claude-opus-4): 64 msgs (25.81%), $52.4955 (69.15%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 135 msgs (54.44%), $12.7243 (16.76%)
- claude-opus-4-7 (priced as claude-opus-4): 49 msgs (19.76%), $10.6936 (14.09%)

## Conversation Shape

- user_msg_count: 17
- user_msg_avg_len: 3712
- turns_before_first_tool: 1
- compaction_count: 4
- skill_invocations: 1
- subagent_dispatches: 2

## Tool Usage

- Bash: 39 (1 failed)
- Read: 19 (3 failed)
- Edit: 17 (1 failed)
- Write: 7
- TaskUpdate: 5
- StructuredOutput: 4
- Grep: 3
- ScheduleWakeup: 2
- Agent: 2
- Monitor: 1
- PowerShell: 1
- Skill: 1
- Glob: 1

## Tool Result Sizes (bytes)

- count: 104
- sum: 160,924
- p50: 214
- p90: 4,216
- max: 22,128

## File Re-reads

- redundant_read_count: 5
- top paths:
  - 3× /home/user/repo/src/MemoryService.Api/Program.cs
  - 3× C:\work\mega\AstraGenie.MemoryService\src\MemoryService.Api\Program.cs
  - 2× src/MemoryService.Api/Program.cs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 38 calls, 33,116B results, ~548,184 cache_create tok (16.55×)
- Read: 18 calls, 91,082B results, ~109,153 cache_create tok (1.2×)
- Edit: 17 calls, 2,911B results, ~39,865 cache_create tok (13.69×)
- StructuredOutput: 4 calls, 156B results, ~37,720 cache_create tok (241.79×)
- Grep: 3 calls, 3,239B results, ~17,810 cache_create tok (5.5×)
- Write: 7 calls, 1,123B results, ~12,238 cache_create tok (10.9×)
- PowerShell: 1 calls, 20B results, ~7,694 cache_create tok (384.7×)
- TaskUpdate: 5 calls, 140B results, ~7,067 cache_create tok (50.48×)
- Agent: 1 calls, 575B results, ~4,182 cache_create tok (7.27×)
- Skill: 1 calls, 28B results, ~2,230 cache_create tok (79.64×)
- Glob: 1 calls, 1,434B results, ~1,308 cache_create tok (0.91×)
- ScheduleWakeup: 2 calls, 314B results, ~936 cache_create tok (2.98×)
- Monitor: 1 calls, 208B results, ~314 cache_create tok (1.51×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 49
- usd: $10.6936
- input: 109
- cache_create_5m: 208,691
- cache_create_1h: 0
- cache_read: 1,471,198
- output: 60,963

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 135
- usd: $12.7243
- input: 13,374
- cache_create_5m: 0
- cache_create_1h: 509,216
- cache_read: 28,627,569
- output: 69,373

### claude-opus-4-8 (priced as claude-opus-4)
- messages: 64
- usd: $52.4955
- input: 11,732
- cache_create_5m: 0
- cache_create_1h: 76,786
- cache_read: 30,169,535
- output: 63,488

