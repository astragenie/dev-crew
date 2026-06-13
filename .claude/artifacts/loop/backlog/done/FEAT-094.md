---
id: FEAT-094
status: done
priority: P3
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-13
depends_on: []
slices: []
derived_from: null
composite_score: 0.3
source_competitors: [CrewAI]
autonomous_safe: true
tags: [telemetry, observability, dispatch]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.3
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.4
pm_technical_risk: 0.35
pm_dependency_depth: 0.05
composite_priority: P3
effort_points: 3
ac_clarity: passing
ac_rewrite: true
ac_rewrite_dispatch_ok: true
demand_evidence: |
scope_notes: |
risks: [Pre-mortem (Q1) 2 weeks later this failed validation — most likely]
triage_notes: |
github_issue: 174
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/174"
completed_at: 2026-06-13
---
# FEAT-094: Structured post-run usage metrics object

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- CrewAI

## Description

After any crew run, crew.usage_metrics exposes token counts and LLM performance data as a structured object. loop/crew have cost-insights artifacts but no in-process programmatic metrics object accessible after a dispatch.

## PM Scoring

```json
{
  "featureId": "FEAT-094",
  "scores": {
    "customer_impact": 0.20,
    "effort_estimate": 0.25,
    "strategic_alignment": 0.45,
    "technical_risk": 0.30,
    "dependency_depth": 0.05
  },
  "compositePriority": "P3",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from CrewAI audit. cost-insights artifacts already provide per-run token/cost data.",
  "scopeNotes": "Near-exact duplicate of FEAT-122. CrewAI's usage_metrics is an in-process Python object — this plugin is CLI/Markdown-based. The closest equivalent would be a structured JSON output from node scripts/loop.mjs after a run. Existing cost-insights artifacts partially cover this.",
  "risks": [
    "Near-exact duplicate of FEAT-122",
    "Plugin is not a callable library — in-process metrics object does not apply",
    "Existing cost-insights artifacts already provide the data in a different format"
  ],
  "reasoning": "P3: lowest impact score, near-duplicate, concept doesn't map cleanly to CLI plugin architecture."
}
```

## Scoring

- Impact: 1
- Effort: 1
- Fit: 3
- Composite: 6 / 9

## References

- https://docs.crewai.com/concepts/crews

## Consider rejecting because

Near-exact duplicate of FEAT-122. CrewAI's usage_metrics is an in-process Python object returned from a programmatic API call. This plugin is a Claude Code CLI plugin — there is no equivalent in-process object after a slash command invocation. The existing cost-insights artifacts and auto-dispatch.jsonl already provide the underlying data in file form.

## Acceptance Criteria

**AC-001 (Happy path — metrics artifact written on successful run)**
Given a dispatch run completes successfully via `bun src/scripts/dispatch.mts finalize --run-id <id> --parent-branch <branch> --plan <path>`,
When the finalize step exits with code 0,
Then a file `.claude/artifacts/loop/dispatch/<runId>/dispatch-metrics.json` MUST exist with all of the following fields populated and non-null:
```json
{
  "runId": "<string matching --run-id value>",
  "startedAt": "<ISO 8601 UTC timestamp>",
  "completedAt": "<ISO 8601 UTC timestamp, >= startedAt>",
  "status": "complete",
  "totalTokens": "<integer >= 0>",
  "promptTokens": "<integer >= 0>",
  "completionTokens": "<integer >= 0>",
  "estimatedCostUsd": "<number >= 0.0>",
  "model": "<non-empty string, e.g. claude-sonnet-4-6>",
  "childCount": "<integer >= 1 matching number of plans in the plan file>"
}
```
Pass condition: `jq '.runId' .claude/artifacts/loop/dispatch/<runId>/dispatch-metrics.json` returns the run id string without error.

**AC-002 (CLI access — metrics subcommand prints JSON to stdout)**
Given a dispatch run with id `run-abc123` has completed and its `dispatch-metrics.json` exists at `.claude/artifacts/loop/dispatch/run-abc123/dispatch-metrics.json`,
When the operator runs `bun src/scripts/loop.mts dispatch metrics --run-id run-abc123`,
Then stdout contains valid JSON matching the schema in AC-001 with `"runId": "run-abc123"`,
AND the process exits with code 0,
AND no content is written to stderr.
Pass condition: `bun src/scripts/loop.mts dispatch metrics --run-id run-abc123 | jq .runId` outputs `"run-abc123"`.

**AC-003 (Edge — partial metrics written when run fails mid-way)**
Given a dispatch run with id `run-fail01` where one or more child dispatches fail before the finalize step completes normally,
When `dispatch finalize` exits with code 2 (all-failed) or 1 (error),
Then `.claude/artifacts/loop/dispatch/run-fail01/dispatch-metrics.json` MUST still be written with whatever data is available at the time of failure,
AND the `"status"` field MUST equal `"partial"`,
AND `"completedAt"` MUST be present (set to the time the failure was detected),
AND all numeric token and cost fields MUST be present (zero if no data was collected).
Pass condition: `jq '.status' .claude/artifacts/loop/dispatch/run-fail01/dispatch-metrics.json` outputs `"partial"`.

**AC-004 (Non-blocking write — metrics failure does not abort dispatch)**
Given the `.claude/artifacts/loop/dispatch/<runId>/` directory is not writable (e.g., permissions set to read-only in the test environment),
When `dispatch finalize` runs,
Then the dispatch finalize step completes and exits with its normal code (0 or 2) based on child results,
AND no unhandled exception is thrown by the metrics write path,
AND a single warning line is written to stderr in the form `[dispatch-metrics] write failed: <reason>` with no stack trace.
Pass condition: process exit code is unaffected by the metrics write failure; `echo $?` matches the expected finalize exit code for the child results.

**AC-005 (CLI error — unknown run id returns non-zero exit)**
Given no `dispatch-metrics.json` exists for run id `run-unknown`,
When the operator runs `bun src/scripts/loop.mts dispatch metrics --run-id run-unknown`,
Then the process exits with code 1,
AND stderr contains `[dispatch-metrics] not found: run-unknown`.
Pass condition: `bun src/scripts/loop.mts dispatch metrics --run-id run-unknown; echo $?` outputs `1`.

## Edge Cases

- **Zero-child plan**: `childCount` is 0 only when the plan file contains an empty `plans` array; token fields default to 0, `status` is `"complete"` if finalize exits 0.
- **Concurrent runs with same runId**: The second finalize call overwrites the metrics file; the `completedAt` timestamp reflects the later write. No locking is applied (single-writer CLI assumption).
- **Very large runs (childCount > 50)**: Token fields are 64-bit integers; `estimatedCostUsd` is a JSON number with up to 6 decimal places. No field is capped or truncated.
- **Missing model name**: If the model cannot be determined from the dispatch context, `model` is set to `"unknown"` rather than `null` so downstream `jq` queries do not fail type checks.
- **`--run-id` flag absent from metrics subcommand**: Process exits 1 with stderr `[dispatch-metrics] --run-id is required`.
