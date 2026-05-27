---
kind: cost-report
run_title: "Fix empty crew artifacts (cross-repo)"
usd: 11.5112
duration_ms: 350088
total_tokens: 8006264
cache_hit_pct: 99.1
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-05-24T23:06:33.239Z
---

# Cost Report: Cost — Fix empty crew artifacts (cross-repo)

- Created: 2026-05-24T23:06:33.239Z
- Run Title: Fix empty crew artifacts (cross-repo)
- Window Start: 2026-05-24T23:00:42.520Z
- Window End: 2026-05-24T23:06:32.608Z
- Duration: 5.8 min (350088 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 70
- Total Tokens: 8,006,264
- Cache Hit %: 99.1%
- Total USD: $11.5112
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-hero-crew-autonomous-loop: 39 msgs, $9.4590
- C--work-mega-Astra-LoopObserver: 31 msgs, $2.0522

## Tokens (totals)

- input: 80
- cache_create_5m: 0
- cache_create_1h: 74,945
- cache_read: 7,855,409
- output: 75,830

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 39 msgs (55.71%), $9.4590 (82.17%)
- claude-sonnet-4-6 (priced as claude-sonnet-4): 31 msgs (44.29%), $2.0522 (17.83%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 4280
- turns_before_first_tool: 2
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 13 (3 failed)
- Grep: 7
- Read: 6
- Edit: 3
- Glob: 2
- Agent: 1
- Write: 1

## Tool Result Sizes (bytes)

- count: 34
- sum: 29,643
- p50: 231
- p90: 2,061
- max: 8,320

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 13 calls, 9,565B results, ~31,029 cache_create tok (3.24×)
- Read: 6 calls, 14,966B results, ~13,899 cache_create tok (0.93×)
- Agent: 1 calls, 895B results, ~10,130 cache_create tok (11.32×)
- Grep: 7 calls, 3,075B results, ~9,345 cache_create tok (3.04×)
- Edit: 3 calls, 520B results, ~3,129 cache_create tok (6.02×)
- Glob: 2 calls, 226B results, ~1,717 cache_create tok (7.6×)
- Write: 1 calls, 165B results, ~1,229 cache_create tok (7.45×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 31
- usd: $2.0522
- input: 31
- cache_create_5m: 0
- cache_create_1h: 44,796
- cache_read: 2,888,508
- output: 61,117

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 39
- usd: $9.4590
- input: 49
- cache_create_5m: 0
- cache_create_1h: 30,149
- cache_read: 4,966,901
- output: 14,713

