---
kind: cost-report
slice: SLICE-14
run_title: "SLICE-14: NoopProvider + LinearProvider + getProvider resolver — SHIPPED"
usd: 4.3529
duration_ms: 900598
total_tokens: 7828664
cache_hit_pct: 98.5
review_decision: approved
source_project: C--work-mega-loop
aggregate_all: false
source_count: 1
created_at: 2026-06-02T22:20:28.020Z
---

# Cost Report: SLICE-14: NoopProvider + LinearProvider + getProvider resolver — SHIPPED

- Created: 2026-06-02T22:20:28.020Z
- Run Title: SLICE-14: NoopProvider + LinearProvider + getProvider resolver — SHIPPED
- Window Start: 2026-06-02T22:05:27.327Z
- Window End: 2026-06-02T22:20:27.925Z
- Duration: 15.0 min (900598 ms)
- Sessions Scanned: 2
- Assistant Messages Counted: 63
- Total Tokens: 7,828,664
- Cache Hit %: 98.5%
- Total USD: $4.3529
- Source Project: C--work-mega-loop
- Auto-detected: no
- Aggregate All: no

## Outcome Linkage

- Slice: SLICE-14
- Grade Avg: -
- Review Decision: approved
- Validation Decision: -

## Tokens (totals)

- input: 493
- cache_create_5m: 65,960
- cache_create_1h: 48,732
- cache_read: 7,683,457
- output: 30,022

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 60 msgs (95.24%), $3.0325 (69.67%)
- claude-opus-4-7 (priced as claude-opus-4): 3 msgs (4.76%), $1.3205 (30.34%)

## Conversation Shape

- user_msg_count: 1
- user_msg_avg_len: 21334
- turns_before_first_tool: 1
- compaction_count: 0
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 15 (2 failed)
- Write: 5
- Read: 3 (1 failed)
- Glob: 2
- Agent: 1
- Edit: 1

## Tool Result Sizes (bytes)

- count: 28
- sum: 20,766
- p50: 271
- p90: 2,181
- max: 4,594

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 14 calls, 8,819B results, ~87,456 cache_create tok (9.92×)
- Write: 5 calls, 864B results, ~13,805 cache_create tok (15.98×)
- Agent: 1 calls, 3,913B results, ~5,727 cache_create tok (1.46×)
- Glob: 2 calls, 5,085B results, ~3,608 cache_create tok (0.71×)
- Read: 3 calls, 1,072B results, ~1,336 cache_create tok (1.25×)
- Edit: 1 calls, 178B results, ~570 cache_create tok (3.2×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 60
- usd: $3.0325
- input: 480
- cache_create_5m: 0
- cache_create_1h: 48,732
- cache_read: 7,650,687
- output: 29,564

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 3
- usd: $1.3205
- input: 13
- cache_create_5m: 65,960
- cache_create_1h: 0
- cache_read: 32,770
- output: 458

