---
kind: cost-report
feature: FEAT-026
run_title: "FEAT026 SLICE52"
usd: 30.7658
duration_ms: 44688973
total_tokens: 40533215
cache_hit_pct: 98.6
source_project: C--work-mega-devcrew
aggregate_all: false
source_count: 1
run_id: "2026-11-06T05:19:31.430Z_2026-11-06T17:44:20.403Z"
created_at: 2026-11-06T17:44:20.556Z
---

# Cost Report: FEAT026 SLICE52

- Created: 2026-11-06T17:44:20.556Z
- Run Title: FEAT026 SLICE52
- Window Start: 2026-11-06T05:19:31.430Z
- Window End: 2026-11-06T17:44:20.403Z
- Duration: 744.8 min (44688973 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 180
- Total Tokens: 40,533,215
- Cache Hit %: 98.6%
- Total USD: $30.7658
- Source Project: C--work-mega-devcrew
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 3,638
- cache_create_5m: 0
- cache_create_1h: 551,618
- cache_read: 39,751,870
- output: 226,089

## Model Mix

- claude-fable-5-1 (priced as claude-fable-5-1): 165 msgs (91.67%), $28.0495 (91.17%)
- claude-opus-5 (priced as claude-opus-5): 15 msgs (8.33%), $2.7162 (8.83%)

## Conversation Shape

- user_msg_count: 36
- user_msg_avg_len: 2790
- turns_before_first_tool: 2
- compaction_count: 3
- skill_invocations: 2
- subagent_dispatches: 15

## Tool Usage

- Bash: 41 (1 failed)
- Agent: 15
- SendMessage: 12
- Skill: 2
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 71
- sum: 110,078
- p50: 383
- p90: 4,047
- max: 17,957

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 40 calls, 98,983B results, ~235,613 cache_create tok (2.38×)
- Agent: 15 calls, 7,104B results, ~104,873 cache_create tok (14.76×)
- SendMessage: 12 calls, 3,694B results, ~39,207 cache_create tok (10.61×)
- Skill: 2 calls, 68B results, ~12,270 cache_create tok (180.44×)
- ToolSearch: 1 calls, 53B results, ~2,932 cache_create tok (55.32×)


## By Model (token detail)

### claude-fable-5-1 (priced as claude-fable-5-1)
- messages: 165
- usd: $28.0495
- input: 3,608
- cache_create_5m: 0
- cache_create_1h: 527,833
- cache_read: 29,636,188
- output: 200,955

### claude-opus-5 (priced as claude-opus-5)
- messages: 15
- usd: $2.7162
- input: 30
- cache_create_5m: 0
- cache_create_1h: 23,785
- cache_read: 10,115,682
- output: 25,134

