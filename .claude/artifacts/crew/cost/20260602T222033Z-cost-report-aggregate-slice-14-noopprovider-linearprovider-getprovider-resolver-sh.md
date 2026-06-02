---
kind: cost-report
slice: SLICE-14
run_title: "SLICE-14: NoopProvider + LinearProvider + getProvider resolver — SHIPPED"
usd: 7.3878
duration_ms: 900598
total_tokens: 15804324
cache_hit_pct: 99.0
review_decision: approved
source_project: aggregate
aggregate_all: true
source_count: 2
created_at: 2026-06-02T22:20:33.013Z
---

# Cost Report: SLICE-14: NoopProvider + LinearProvider + getProvider resolver — SHIPPED

- Created: 2026-06-02T22:20:33.013Z
- Run Title: SLICE-14: NoopProvider + LinearProvider + getProvider resolver — SHIPPED
- Window Start: 2026-06-02T22:05:27.327Z
- Window End: 2026-06-02T22:20:27.925Z
- Duration: 15.0 min (900598 ms)
- Sessions Scanned: 3
- Assistant Messages Counted: 115
- Total Tokens: 15,804,324
- Cache Hit %: 99.0%
- Total USD: $7.3878
- Source Project: aggregate
- Auto-detected: no
- Aggregate All: yes

## Sources (aggregated)

- C--work-mega-loop: 63 msgs, $4.3529
- C--work-mega-common: 52 msgs, $3.0349

## Outcome Linkage

- Slice: SLICE-14
- Grade Avg: -
- Review Decision: approved
- Validation Decision: -

## Tokens (totals)

- input: 917
- cache_create_5m: 65,960
- cache_create_1h: 91,310
- cache_read: 15,589,017
- output: 57,120

## Model Mix

- claude-sonnet-4-6 (priced as claude-sonnet-4): 112 msgs (97.39%), $6.0674 (82.13%)
- claude-opus-4-7 (priced as claude-opus-4): 3 msgs (2.61%), $1.3205 (17.87%)

## Conversation Shape

- user_msg_count: 2
- user_msg_avg_len: 10682
- turns_before_first_tool: 1
- compaction_count: 1
- skill_invocations: 0
- subagent_dispatches: 1

## Tool Usage

- Bash: 18 (2 failed)
- PowerShell: 11
- Write: 5
- Read: 4 (1 failed)
- Edit: 3
- Glob: 2
- ScheduleWakeup: 1
- Agent: 1

## Tool Result Sizes (bytes)

- count: 46
- sum: 33,097
- p50: 262
- p90: 2,181
- max: 4,594

## File Re-reads

- redundant_read_count: 0

## Cache Priming (per tool, approximate)

Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise — system-prompt drift and prior-turn re-injection inflate ratios.

- Bash: 17 calls, 10,195B results, ~93,709 cache_create tok (9.19×)
- PowerShell: 11 calls, 9,356B results, ~27,655 cache_create tok (2.96×)
- Write: 5 calls, 864B results, ~13,805 cache_create tok (15.98×)
- Agent: 1 calls, 3,913B results, ~5,727 cache_create tok (1.46×)
- Edit: 3 calls, 476B results, ~5,412 cache_create tok (11.37×)
- Read: 4 calls, 2,216B results, ~4,318 cache_create tok (1.95×)
- Glob: 2 calls, 5,085B results, ~3,608 cache_create tok (0.71×)
- ScheduleWakeup: 1 calls, 157B results, ~2,022 cache_create tok (12.88×)


## By Model (token detail)

### claude-sonnet-4-6 (priced as claude-sonnet-4)
- messages: 112
- usd: $6.0674
- input: 904
- cache_create_5m: 0
- cache_create_1h: 91,310
- cache_read: 15,556,247
- output: 56,662

### claude-opus-4-7 (priced as claude-opus-4)
- messages: 3
- usd: $1.3205
- input: 13
- cache_create_5m: 65,960
- cache_create_1h: 0
- cache_read: 32,770
- output: 458

