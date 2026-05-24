---
kind: cost-report
run_title: "Cross-repo: FEAT/phase flags + cost-advise --title"
usd: 159.0048
duration_ms: 816686
total_tokens: 96882355
cache_hit_pct: 99.6
source_project: aggregate
aggregate_all: true
source_count: 4
created_at: 2026-05-24T10:38:20.431Z
---

# Cost Report: Cost — Cross-repo: FEAT/phase flags + cost-advise --title

- Created: 2026-05-24T10:38:20.431Z
- Run Title: Cross-repo: FEAT/phase flags + cost-advise --title
- Window Start: 2026-05-24T10:24:43.279Z
- Window End: 2026-05-24T10:38:19.965Z
- Duration: 13.6 min (816686 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 320
- Total Tokens: 96,882,355
- Cache Hit %: 99.6%
- Total USD: $159.0048
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-hero-crew-autonomous-loop: 150 msgs, $118.7932
- C--work-mega-AstraGenie-Common: 90 msgs, $23.5118
- C--work-mega-AstraGenie-MemoryService: 18 msgs, $13.9743
- C--work-mega-Astra-LoopObserver: 62 msgs, $2.7255

## Tokens (totals)

- input: 412
- cache_create_5m: 0
- cache_create_1h: 372,986
- cache_read: 96,319,192
- output: 189,765

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 258 msgs (80.63%), $156.2793 (98.29%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 62 msgs (19.38%), $2.7255 (1.71%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 509
- turns_before_first_tool: 1
- compaction_count: 1
- skill_invocations: 0
- subagent_dispatches: 4

## Tool Usage

- Bash: 69
- Edit: 45 (3 failed)
- Read: 30
- TaskUpdate: 26
- PowerShell: 17 (4 failed)
- TaskCreate: 11
- Grep: 10
- Agent: 4
- AskUserQuestion: 2
- Write: 2
- Glob: 2

## Tool Result Sizes (bytes)

- count: 219
- sum: 161,777
- p50: 171
- p90: 2,103
- max: 15,815

## File Re-reads

- redundant_read_count: 8
- top paths:
  - 4× C:\work\mega\hero-crew\scripts\lib\artifacts.mjs
  - 3× C:\work\mega\hero-crew\scripts\crew.mjs
  - 3× C:\work\mega\hero-crew\tests\cli.test.mjs
  - 2× C:\work\mega\hero-crew-autonomous-loop\scripts\lib\slice-linker\crew-bridge.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 69 calls, 55,206B results, ~108,309 cache_create tok (1.96×)
- Read: 30 calls, 74,258B results, ~78,213 cache_create tok (1.05×)
- Edit: 45 calls, 7,066B results, ~73,205 cache_create tok (10.36×)
- Agent: 3 calls, 5,253B results, ~25,363 cache_create tok (4.83×)
- PowerShell: 16 calls, 5,557B results, ~24,085 cache_create tok (4.33×)
- TaskUpdate: 26 calls, 597B results, ~23,824 cache_create tok (39.91×)
- TaskCreate: 11 calls, 882B results, ~20,283 cache_create tok (23×)
- Grep: 10 calls, 9,869B results, ~11,447 cache_create tok (1.16×)
- Write: 2 calls, 326B results, ~1,209 cache_create tok (3.71×)
- AskUserQuestion: 2 calls, 298B results, ~1,175 cache_create tok (3.94×)
- Glob: 2 calls, 28B results, ~881 cache_create tok (31.46×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 62
- usd: $2.7255
- input: 74
- cache_create_5m: 0
- cache_create_1h: 98,085
- cache_read: 5,191,095
- output: 38,631

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 258
- usd: $156.2793
- input: 338
- cache_create_5m: 0
- cache_create_1h: 274,901
- cache_read: 91,128,097
- output: 151,134

