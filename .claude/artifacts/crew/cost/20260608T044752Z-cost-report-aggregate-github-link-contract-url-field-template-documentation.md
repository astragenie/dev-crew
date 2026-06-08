---
kind: cost-report
run_title: "github-link contract: URL field + template documentation"
usd: 68.5599
duration_ms: 959946
total_tokens: 30531022
cache_hit_pct: 98.3
source_project: aggregate
aggregate_all: true
source_count: 3
created_at: 2026-06-08T04:47:52.830Z
---

# Cost Report: github-link contract: URL field + template documentation

- Created: 2026-06-08T04:47:52.830Z
- Run Title: github-link contract: URL field + template documentation
- Window Start: 2026-06-08T04:31:49.184Z
- Window End: 2026-06-08T04:47:49.130Z
- Duration: 16.0 min (959946 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 183
- Total Tokens: 30,531,022
- Cache Hit %: 98.3%
- Total USD: $68.5599
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 101 msgs, $38.8225
- C--work-mega-hero-crew: 53 msgs, $21.0576
- C--work-mega-loopobserver: 29 msgs, $8.6798

## Tokens (totals)

- input: 228
- cache_create_5m: 0
- cache_create_1h: 504,516
- cache_read: 29,912,243
- output: 114,035

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 183 msgs (100%), $68.5599 (100%)

## Conversation Shape

- user_msg_count: 3
- user_msg_avg_len: 172
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 3

## Tool Usage

- Read: 34
- Bash: 30 (4 failed)
- TaskUpdate: 21
- Grep: 14
- Edit: 10
- TaskCreate: 8
- Glob: 6 (1 failed)
- Agent: 3
- ToolSearch: 2
- Write: 1
- Monitor: 1

## Tool Result Sizes (bytes)

- count: 131
- sum: 145,207
- p50: 215
- p90: 2,584
- max: 20,686

## File Re-reads

- redundant_read_count: 3
- top paths:
  - 3× C:\Users\serge\AppData\Local\Temp\claude\C--work-mega-loopobserver\b3afe8d9-1aae-4b96-aceb-8fb6ee441dff\tasks\b7bz4hjit.output
  - 2× C:\work\mega\loop\tests\github-sync.test.mjs

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Grep: 14 calls, 9,418B results, ~224,086 cache_create tok (23.79×)
- Read: 34 calls, 95,462B results, ~166,157 cache_create tok (1.74×)
- Bash: 29 calls, 19,430B results, ~42,103 cache_create tok (2.17×)
- Agent: 3 calls, 13,050B results, ~20,854 cache_create tok (1.6×)
- Edit: 10 calls, 1,534B results, ~17,107 cache_create tok (11.15×)
- TaskUpdate: 20 calls, 440B results, ~12,507 cache_create tok (28.43×)
- ToolSearch: 2 calls, 104B results, ~6,797 cache_create tok (65.36×)
- TaskCreate: 8 calls, 525B results, ~6,084 cache_create tok (11.59×)
- Glob: 6 calls, 3,195B results, ~3,877 cache_create tok (1.21×)
- Write: 1 calls, 191B results, ~2,540 cache_create tok (13.3×)
- Monitor: 1 calls, 208B results, ~1,302 cache_create tok (6.26×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 183
- usd: $68.5599
- input: 228
- cache_create_5m: 0
- cache_create_1h: 504,516
- cache_read: 29,912,243
- output: 114,035

