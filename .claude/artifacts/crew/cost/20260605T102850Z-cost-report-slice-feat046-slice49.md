---
kind: cost-report
feature: FEAT-046
run_title: "FEAT046 SLICE49"
usd: 3.7978
duration_ms: 2304001
total_tokens: 7996605
cache_hit_pct: 98.8
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-05T10:28:50.786Z
---

# Cost Report: FEAT046 SLICE49

- Created: 2026-06-05T10:28:50.786Z
- Run Title: FEAT046 SLICE49
- Window Start: 2026-06-05T09:50:26.647Z
- Window End: 2026-06-05T10:28:50.648Z
- Duration: 38.4 min (2304001 ms)
- Sessions Scanned: 1
- Assistant Messages Counted: 54
- Total Tokens: 7,996,605
- Cache Hit %: 98.8%
- Total USD: $3.7978
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Tokens (totals)

- input: 2,050
- cache_create_5m: 0
- cache_create_1h: 93,960
- cache_read: 7,842,245
- output: 58,350

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 54 msgs (100%), $3.7978 (100%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 24
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 9

## Tool Usage

- Bash: 18 (1 failed)
- Agent: 9
- Edit: 4
- Read: 2
- ToolSearch: 1

## Tool Result Sizes (bytes)

- count: 35
- sum: 31,778
- p50: 399
- p90: 2,156
- max: 4,870

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Agent: 9 calls, 17,131B results, ~70,717 cache_create tok (4.13×)
- Bash: 18 calls, 12,573B results, ~13,523 cache_create tok (1.08×)
- ToolSearch: 1 calls, 55B results, ~4,704 cache_create tok (85.53×)
- Edit: 4 calls, 577B results, ~3,602 cache_create tok (6.24×)
- Read: 2 calls, 1,153B results, ~572 cache_create tok (0.5×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 54
- usd: $3.7978
- input: 2,050
- cache_create_5m: 0
- cache_create_1h: 93,960
- cache_read: 7,842,245
- output: 58,350

