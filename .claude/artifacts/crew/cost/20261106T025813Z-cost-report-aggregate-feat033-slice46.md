---
kind: cost-report
feature: FEAT-033
run_title: "FEAT033 SLICE46"
usd: 26.3932
duration_ms: 840472
total_tokens: 71358358
cache_hit_pct: 99.4
source_project: aggregate
aggregate_all: true
source_count: 5
created_at: 2026-11-06T02:58:13.337Z
---

# Cost Report: FEAT033 SLICE46

- Created: 2026-11-06T02:58:13.337Z
- Run Title: FEAT033 SLICE46
- Window Start: 2026-11-06T02:44:12.386Z
- Window End: 2026-11-06T02:58:12.858Z
- Duration: 14.0 min (840472 ms)
- Sessions Scanned: 7
- Assistant Messages Counted: 155
- Total Tokens: 71,358,358
- Cache Hit %: 99.4%
- Total USD: $26.3932
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega--wt-prism-imagesharp-4: 38 msgs, $8.3619
- C--work-mega-devcrew: 56 msgs, $8.3366
- C--work-mega-astramem-local: 31 msgs, $7.3386
- C--work-mega-devops: 26 msgs, $2.1077
- C--Users-serge-AppData-Local-Temp-claude-C--work-mega-devcrew-3d4e455a-578a-4759-90df-728b77b7f416-scratchpad-verify-046-repo: 4 msgs, $0.2483

## Tokens (totals)

- input: 4,064
- cache_create_5m: 0
- cache_create_1h: 437,307
- cache_read: 70,714,357
- output: 202,630

## Model Mix

- claude-fable-5-1 (priced as claude-sonnet-4): 151 msgs (97.42%), $26.1448 (99.06%)
- claude-haiku-4-5-20251001 (priced as claude-haiku-4): 4 msgs (2.58%), $0.2483 (0.94%)

## Conversation Shape

- user_msg_count: 16
- user_msg_avg_len: 1640
- turns_before_first_tool: 6
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 5

## Tool Usage

- Bash: 56 (3 failed)
- Agent: 5
- AskUserQuestion: 1
- Write: 1
- Edit: 1
- SendMessage: 1

## Tool Result Sizes (bytes)

- count: 68
- sum: 65,228
- p50: 443
- p90: 2,760
- max: 5,997

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 55 calls, 45,728B results, ~239,013 cache_create tok (5.23×)
- Agent: 5 calls, 1,545B results, ~33,091 cache_create tok (21.42×)
- AskUserQuestion: 0 calls, 0B results, ~14,805 cache_create tok (—)
- SendMessage: 1 calls, 373B results, ~8,503 cache_create tok (22.8×)
- Write: 1 calls, 214B results, ~5,741 cache_create tok (26.83×)
- Edit: 1 calls, 163B results, ~578 cache_create tok (3.55×)


## By Model (token detail)

### claude-haiku-4-5-20251001 (priced as claude-haiku-4)
- messages: 4
- usd: $0.2483
- input: 40
- cache_create_5m: 0
- cache_create_1h: 120,936
- cache_read: 43,256
- output: 416

### claude-fable-5-1 (priced as claude-sonnet-4)
- messages: 151
- usd: $26.1448
- input: 4,024
- cache_create_5m: 0
- cache_create_1h: 316,371
- cache_read: 70,671,101
- output: 202,214

