---
id: FEAT-090
status: triaged
priority: P4
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-13
depends_on: []
slices: []
derived_from: null
composite_score: 4
source_competitors: [Aider]
autonomous_safe: false
tags: [telemetry, observability]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.15
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.2
pm_technical_risk: 0.3
pm_dependency_depth: 0.05
ac_clarity_status: passed
needs_ac_rewrite: false
declined_per: ["backlog-discipline", "repo-conventions"]
triage_notes: "PHASE-C RESCORE 2026-06-13. AC rewritten by loop:spec-writer to 5 GWT criteria (opt-in via loop.analyticsLog, PostHog-compatible schema with event/distinct_id/timestamp/properties, opt-in gate, zero-tool-call edge, non-fatal write failure). Cleaned AC clarify scope but EXPAND overlap: FEAT-008/SLICE-21 (trajectory-writer.mts, commit 1f7dee44) already ships per-slice JSONL step logs with tool/model/token data; FEAT-083/SLICE-90 (commit f3285385) extended auto-dispatch.jsonl with stepType + token fields. The original triage_notes' 'FEAT-118 duplicate' citation was unverifiable (no FEAT-118 file exists, no commit references it) — replaced with real done analogs. Net residual scope = PostHog wire-format wrapper around already-shipped data, which AC-001 reveals serves Aider's SaaS replay pipeline, not loop. Cost analog: FEAT-008 trajectory shipped at ~25 min / 33M tokens — PostHog wrapper would be ~0.3 of that, but value delivered is ~0.0 above existing trajectory + auto-dispatch.jsonl. Decline cites backlog-discipline (duplication of done work) and repo-conventions (PostHog-specific wire format adds external-vendor coupling to a local plugin)."
github_issue: 172
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/172"
---
# FEAT-090: Per-session analytics log (local PostHog-compatible JSONL)

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Aider

## Description

--analytics-log writes every tool call, model, and token count to a JSONL file the user controls. loop / crew emit no structured per-session telemetry beyond cost-insights artifacts.

## PM Scoring

```json
{
  "featureId": "FEAT-090",
  "scores": {
    "customer_impact": 0.15,
    "effort_estimate": 0.20,
    "strategic_alignment": 0.20,
    "technical_risk": 0.30,
    "dependency_depth": 0.05
  },
  "compositePriority": "P4",
  "autonomousSafe": false,
  "demandEvidence": "none — Aider competitor-audit derived. No user request, no grade-lesson signal, no spec mandate. Cleaned GWT AC do not surface new demand evidence.",
  "scopeNotes": "Rewritten AC (5 GWT criteria) clarify the proposal but EXPOSE the overlap rather than resolve it. AC-001/002 describe the same data shipped by `src/scripts/lib/trajectory-writer.mts` (FEAT-008/SLICE-21, commit 1f7dee44) — per-slice JSONL with event type + model + token counts already exists. FEAT-083/SLICE-90 (commit f3285385) added stepType + token fields to auto-dispatch.jsonl. The only residual novelty is the PostHog wire-format wrapper (event/distinct_id/timestamp/properties). That serves Aider's SaaS replay pipeline, not a local plugin. Original triage cited a 'FEAT-118 duplicate' that does not exist in the backlog or git history — correction noted in scopeNotes. Weak-dimension check: observability avg over last 5 grades = 0.82 (above 0.80 threshold), no observability gap to justify scope addition. Cost analog: FEAT-008 trajectory ran 25 min / 33M tokens; residual PostHog wrapper would be ~30% of that with near-zero value above existing artifacts.",
  "risks": [
    "Pre-mortem #1 (failure two weeks out): builder discovers AC-001/002 duplicate trajectory-writer.mts, asks 'what do we ship that we don't already ship?' — slice stalls or produces a trivial schema re-cast nobody reads.",
    "Pre-mortem #2 (rollback): low — a thin PostHog wrapper layer reverts cleanly with `git revert`; no schema migration. But the cost of writing it is not recovered.",
    "Pre-mortem #3 (test gap): no existing test would catch a regression in PostHog wire-format conformance, because no downstream consumer reads it. The AC's own assertions (regex on timestamp, key presence) are the only signal — circular.",
    "Vendor coupling: PostHog-compatible schema is an external SaaS contract; adding it to a local plugin pulls a wire-format dependency we don't otherwise have.",
    "Demand is inferred from competitor parity, not from a loop user or grade-lesson follow-up — Framework 1 demand-evidence floor: customer_impact capped <= 0.3."
  ],
  "reasoning": "P4 decline: technical_risk band 0.3 (one-module wrapper, clean rollback) but residual scope is wire-format wrapper on data already shipped by FEAT-008 + FEAT-083. Cites backlog-discipline (duplication) and repo-conventions (external-vendor wire format in local plugin). Critical-thinking probe could not produce a stakeholder for the PostHog format — demand evidence stays 'none'."
}
```

## Scoring

- Impact: 1
- Effort: 1
- Fit: 3
- Composite: 6 / 9

## References

- https://aider.chat/docs/more/analytics.html

## Acceptance Criteria

**Definitions**

- **Session**: a single invocation of a loop or crew slash command from start to finish.
- **Analytics log**: a JSONL file at `.claude/artifacts/loop/analytics/<session-id>.jsonl` where each line is one event object.
- **PostHog-compatible schema**: each event object has at minimum `event` (string), `distinct_id` (string), `timestamp` (ISO-8601 string), and `properties` (object) — matching the PostHog capture format so the file can be replayed into a PostHog `/capture` endpoint without transformation.
- **Opt-in**: analytics logging is disabled by default. A user enables it by setting `loop.analyticsLog: true` in `.claude/loop.json`.
- **Non-fatal write failure**: a file-write error that does not throw or reject the calling slice lifecycle; it logs a `warn`-level message and continues.

---

**AC-001 — Happy path: JSONL file created with correct schema**

Given `loop.analyticsLog: true` is set in `.claude/loop.json`,
When a session completes at least one tool call,
Then a file exists at `.claude/artifacts/loop/analytics/<session-id>.jsonl` where every line is valid JSON, and each parsed object contains:
- `event` (string, e.g. `"tool_call"` or `"session_end"`),
- `distinct_id` (string matching the session-id),
- `timestamp` (string matching ISO-8601 format `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`),
- `properties` (object).

**AC-002 — Content: tool-call events include model, tool name, and token counts**

Given `loop.analyticsLog: true` and a session that invokes at least one tool,
When a `tool_call` event is written to the analytics log,
Then `properties` contains:
- `tool_name` (string, the name of the tool invoked),
- `model` (string, e.g. `"claude-sonnet-4-6"`),
- `input_tokens` (number >= 0),
- `output_tokens` (number >= 0).

**AC-003 — Opt-in gate: no file emitted when feature is disabled**

Given `loop.analyticsLog` is absent from `.claude/loop.json` OR is set to `false`,
When a session completes (with or without tool calls),
Then no file is created under `.claude/artifacts/loop/analytics/` for that session.

**AC-004 — Edge case: no events written for a session with zero tool calls**

Given `loop.analyticsLog: true` and a session that produces zero tool calls (e.g. a `--help` invocation or a no-op command),
When the session exits,
Then no analytics file is created for that session (or if a `session_start` event was optimistically written, it is removed on exit), so the analytics directory contains no file whose `distinct_id` matches that session-id.

**AC-005 — Error case: write failure is non-fatal**

Given `loop.analyticsLog: true` and the analytics output directory is not writable (e.g. permissions set to read-only in the test fixture),
When a session attempts to write a tool-call event,
Then:
- the session continues to completion without throwing or rejecting,
- a `warn`-level log line containing `analytics write failed` appears in session output,
- no unhandled exception or process crash occurs.

---

## Edge Cases

- **Concurrent sessions**: each session writes to its own `<session-id>.jsonl` file; no cross-session file locking is required.
- **Partial session (crash mid-run)**: events written before the crash remain in the file; no rollback. Downstream consumers must tolerate a missing `session_end` event.
- **Very large sessions (> 1 000 tool calls)**: the JSONL file grows unboundedly within one session; no size cap is enforced at the FEAT level. Rotation or pruning is out of scope.
- **PostHog `distinct_id` privacy**: `distinct_id` MUST NOT contain the user's OS username, email, or machine hostname. Use the session-id (a random or timestamp-derived token generated at session start).
- **Schema evolution**: adding new fields to `properties` is non-breaking; removing or renaming existing fields (`tool_name`, `model`, `input_tokens`, `output_tokens`) is a breaking change requiring a new FEAT.

## Consider rejecting because

Near-exact duplicate of FEAT-118 (referenced in triage notes; no FEAT-118 file exists in the backlog — unverifiable). PostHog-compatible format serves Aider's SaaS analytics pipeline, not a local plugin use case. Existing cost-insights artifacts and auto-dispatch.jsonl already provide machine-readable per-run data. No user has requested this format.
