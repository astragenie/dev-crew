---
kind: cost-report
slice: SLICE-08
run_title: "SLICE-08 cross-session learnings JSONL store"
usd: 51.8248
duration_ms: 594153
total_tokens: 27869018
cache_hit_pct: 99.3
source_project: aggregate
aggregate_all: true
source_count: 4
created_at: 2026-05-28T19:50:32.937Z
---

# Cost Report: SLICE-08 cross-session learnings JSONL store

- Created: 2026-05-28T19:50:32.937Z
- Run Title: SLICE-08 cross-session learnings JSONL store
- Window Start: 2026-05-28T19:40:37.393Z
- Window End: 2026-05-28T19:50:31.546Z
- Duration: 9.9 min (594153 ms)
- Sessions Scanned: 4
- Assistant Messages Counted: 129
- Total Tokens: 27,869,018
- Cache Hit %: 99.3%
- Total USD: $51.8248
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-hero-crew: 44 msgs, $25.1610
- C--work-mega-AstraGenie-MemoryService: 16 msgs, $14.2464
- C--work-mega-Astra-Humanizer: 17 msgs, $10.4977
- C--work-mega-hero-crew-autonomous-loop: 52 msgs, $1.9196

## Outcome Linkage

- Slice: SLICE-08
- Grade Avg: -
- Review Decision: -
- Validation Decision: -

## Tokens (totals)

- input: 330
- cache_create_5m: 0
- cache_create_1h: 194,563
- cache_read: 27,508,816
- output: 165,309

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 77 msgs (59.69%), $49.9051 (96.3%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 52 msgs (40.31%), $1.9196 (3.7%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 9
- turns_before_first_tool: 0
- compaction_count: 2
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 44
- Edit: 18
- Read: 8
- TaskUpdate: 5
- Write: 2
- PowerShell: 1
- Grep: 1
- Agent: 1

## Tool Result Sizes (bytes)

- count: 83
- sum: 54,684
- p50: 248
- p90: 1,471
- max: 7,648

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\hero-crew-autonomous-loop\src\scripts\lib\slice-linker\start-slice.mts
  - 2× C:\work\mega\hero-crew-autonomous-loop\src\scripts\loop.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 44 calls, 19,710B results, ~89,477 cache_create tok (4.54×)
- Read: 8 calls, 23,691B results, ~33,396 cache_create tok (1.41×)
- Edit: 18 calls, 4,189B results, ~29,065 cache_create tok (6.94×)
- Write: 2 calls, 410B results, ~19,078 cache_create tok (46.53×)
- Agent: 1 calls, 235B results, ~12,573 cache_create tok (53.5×)
- Grep: 1 calls, 16B results, ~6,528 cache_create tok (408×)
- TaskUpdate: 5 calls, 110B results, ~3,778 cache_create tok (34.35×)
- PowerShell: 1 calls, 6B results, ~193 cache_create tok (32.17×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 77
- usd: $49.9051
- input: 270
- cache_create_5m: 0
- cache_create_1h: 120,727
- cache_read: 23,679,209
- output: 143,473

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 52
- usd: $1.9196
- input: 60
- cache_create_5m: 0
- cache_create_1h: 73,836
- cache_read: 3,829,607
- output: 21,836

