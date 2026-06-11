---
kind: cost-report
run_title: "Walker plan emits lead-routing when orchestratorMode=lead"
usd: 21.7345
duration_ms: 451696
total_tokens: 11152140
cache_hit_pct: 99.6
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-11T00:01:15.947Z
---

# Cost Report: Walker plan emits lead-routing when orchestratorMode=lead

- Created: 2026-06-11T00:01:15.947Z
- Run Title: Walker plan emits lead-routing when orchestratorMode=lead
- Window Start: 2026-06-10T23:53:40.655Z
- Window End: 2026-06-11T00:01:12.351Z
- Duration: 7.5 min (451696 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 39
- Total Tokens: 11,152,140
- Cache Hit %: 99.6%
- Total USD: $21.7345
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 34 msgs, $18.6318
- C--work-mega-loopobserver: 5 msgs, $3.1027

## Tokens (totals)

- input: 39
- cache_create_5m: 0
- cache_create_1h: 44,551
- cache_read: 11,056,719
- output: 50,831

## Model Mix

- claude-opus-4-7 (priced as claude-opus-4): 39 msgs (100%), $21.7345 (100%)

## Conversation Shape

- user_msg_count: 0
- user_msg_avg_len: 0
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 2

## Tool Usage

- Bash: 11
- Edit: 9
- Read: 5
- Agent: 2
- Write: 1

## Tool Result Sizes (bytes)

- count: 30
- sum: 20,178
- p50: 234
- p90: 2,984
- max: 3,651

## File Re-reads

- redundant_read_count: 2
- top paths:
  - 2× C:\work\mega\loop\src\scripts\lib\walker-gates.mts
  - 2× C:\work\mega\loop\src\tests\auto-walker.test.mts

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Edit: 9 calls, 1,384B results, ~19,886 cache_create tok (14.37×)
- Bash: 11 calls, 3,556B results, ~11,559 cache_create tok (3.25×)
- Read: 5 calls, 11,918B results, ~6,028 cache_create tok (0.51×)
- Write: 1 calls, 191B results, ~3,065 cache_create tok (16.05×)
- Agent: 1 calls, 1,558B results, ~3,065 cache_create tok (1.97×)


## By Model (token detail)

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 39
- usd: $21.7345
- input: 39
- cache_create_5m: 0
- cache_create_1h: 44,551
- cache_read: 11,056,719
- output: 50,831

