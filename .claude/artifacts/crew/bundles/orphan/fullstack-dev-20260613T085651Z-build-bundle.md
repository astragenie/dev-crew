---
slice: unknown
builder: fullstack-dev
run_id: 20260613T085651Z
feat: FEAT-180
files_touched: ["commands/slice-review-ladder.md", "docs/upstream-requests/2026-06-13-hero-crew-verdict-not-checked-author-judge.md"]
files_read: []
diff_stat: { files: 2, additions: 1, deletions: 28 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-115: add not_checked section to reviewer prompts + upstream-request doc

- Created: 2026-06-13T08:56:51.718Z
- From: fullstack-dev
- To: lead
- Objective: Added ## Not checked section to Reviewer A and B prompt templates in commands/slice-review-ladder.md; created upstream-request proposing not_checked[], author_id, judge_id, self_approval fields for hero-crew write-review-result
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - commands/slice-review-ladder.md
  - docs/upstream-requests/2026-06-13-hero-crew-verdict-not-checked-author-judge.md
- Confidence: high
- Risks: -
- Suggested Next Handoff: Dispatch inspector pair to review FEAT-180 docs changes


## Diff

```diff
diff --git a/.claude/artifacts/loop/auto-dispatch.jsonl b/.claude/artifacts/loop/auto-dispatch.jsonl
index 31f2688..a257747 100644
--- a/.claude/artifacts/loop/auto-dispatch.jsonl
+++ b/.claude/artifacts/loop/auto-dispatch.jsonl
@@ -152,3 +152,4 @@
 {"timestamp":"2026-06-12T15:15:04.605Z","agent":"crew:document-writer","parentCommand":"slice-complete","ok":true,"skipped":true,"skipReason":"cli-refusal-cli-doc-writer-disabled","durationMs":0}
 {"timestamp":"2026-06-12T15:30:35.544Z","agent":"loop:researcher","parentCommand":"backlog-add","ok":false,"skipped":true,"skipReason":"cli-refusal-researcher-disabled","durationMs":0}
 {"timestamp":"2026-06-12T15:35:04.810Z","agent":"crew:document-writer","parentCommand":"slice-complete","ok":true,"skipped":true,"skipReason":"cli-refusal-cli-doc-writer-disabled","durationMs":0}
+{"timestamp":"2026-06-13T08:50:55.422Z","agent":"loop:architect","parentCommand":"slice from-feature","costUsd":null,"durationMs":0,"ok":true,"skipped":false,"skipReason":null,"stepType":"dispatch","inputTokens":null,"outputTokens":null}
diff --git a/.claude/artifacts/loop/backlog/triaged/FEAT-180.md b/.claude/artifacts/loop/backlog/triaged/FEAT-180.md
deleted file mode 100644
index ec052fe..0000000
--- a/.claude/artifacts/loop/backlog/triaged/FEAT-180.md
+++ /dev/null
@@ -1,28 +0,0 @@
----
-id: FEAT-180
-status: triaged
-priority: P2
-category: feature
-target_release: null
-created: 2026-06-10
-updated: 2026-06-10
-depends_on: []
-slices: []
-derived_from: null
-autonomous_safe: true
-pm_customer_impact: 0.5
-pm_effort_estimate: 0.35
-pm_strategic_alignment: 0.65
-pm_technical_risk: 0.25
-pm_dependency_depth: 0.15
-composite_score: 0.64
-triage_notes: "Verdict schema: not_checked[] list + author/judge separation. Loop side is mechanical prompt + display change; backward-compatible; hero-crew owns the artifact write (upstream-request pattern). Low risk, addresses observability weak dim -> autonomous."
----
-# FEAT-180: Review verdict schema: not_checked[] field + author/judge separation
-
-Adopt two AgentOps verdict-schema ideas (schemas/verdict.v1.schema.json, claim-bind levels in C:/work/mega/agentops): (1) review artifacts carry an explicit not_checked[] list — what the reviewer deliberately did NOT cover — killing false confidence from silent scope gaps; (2) evidence/approval records carry separate author_id and judge_id so self-approval is structurally visible.
-
-## Acceptance hints
-- Loop side: reviewer-ladder task prompts require a 'Not checked' section; slice link/grade surfaces it.
-- Crew side (hero-crew owns write-review-result): file an upstream request doc (docs/upstream-requests/ pattern) proposing --not-checked flag and author/judge fields; loop tolerates artifacts without them (backward compatible).
-- Pattern-alert idea: warn when N consecutive reviews have empty not_checked (suspicious).
\ No newline at end of file

```

## Files touched

### commands/slice-review-ladder.md

```
---
description: Emit structured Reviewer A + B (configurable) task prompts for parallel crew:inspector subagent dispatch.
---

# Slice Review Ladder

Builds review-task prompts per the `reviewers.ladder` config (default
`["A", "B"]`). Plugin does not spawn agents — the orchestrator (typically
lead) reads the returned tasks and dispatches each via the Task tool with
`subagent_type: crew:inspector`.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice review-ladder \
  --repo "$PWD" \
  --id SLICE-52
```

Returns:

```json
{
  "sliceId": "SLICE-52",
  "ladder": ["A", "B"],
  "tasks": [
    {
      "reviewer": "A",
      "subagent_type": "crew:inspector",
      "description": "Reviewer A review of SLICE-52",
      "prompt": "You are Reviewer A on the Wiggin Loop ladder ...\n\n## Not checked\n- Performance characteristics of the implementation\n- Cross-platform compatibility beyond the CI test environment\n- Interaction with concurrent slice changes on other branches"
    },
    {
      "reviewer": "B",
      "subagent_type": "crew:inspector",
      "description": "Reviewer B review of SLICE-52",
      "prompt": "You are Reviewer B on the Wiggin Loop ladder ...\n\n## Not checked\n- Correctness of business logic and AC coverage (owned by Reviewer A)\n- Test case adequacy and branch coverage (multidim test-coverage reviewer)\n- Third-party dependency version compatibility outside the pinned lock file"
    }
  ],
  "instructions": "PARALLEL_DISPATCH_CONTRACT v1\nrequired: emit exactly ONE message containing N=2 Agent tool calls\nforbidden: send any message between dispatches\nforbidden: wait for one reviewer return before next dispatch\nviolation: serial-reviewer-warning badge logged to grade\n\nAggregate verdicts — slice passes when all reviewers return PASS or PASS with minor."
}
```

## Default focus areas

| Reviewer | Focus |
|---|---|
| A | Correctness, regressions, acceptance criteria coverage. Flag missing test cases. |
| B | Production-readiness, observability (OTel/logs), security posture, edge cases. |

## Not checked — required section in every reviewer prompt

Every Reviewer A and Reviewer B prompt template includes a `## Not checked` section.
Reviewers must populate this section with items they explicitly did NOT examine, so
the lead can assess residual blind spots before grading.

**Reviewer A prompt — `## Not checked` example:**

```
## Not checked
- Performance characteristics of the implementation (benchmarks, memory allocation patterns)
- Cross-platform compatibility beyond the CI test environment
- Interaction with concurrent slice changes on other branches
```

**Reviewer B prompt — `## Not checked` example:**

```
## Not checked
- Correctness of business logic and acceptance-criterion coverage (owned by Reviewer A)
- Test case adequacy and branch coverage (owned by test-coverage reviewer when multidim)
- Third-party dependency version compatibility outside the pinned lock file
```

Reviewers MUST include at least 2 items. Leaving the section empty causes the inspector
to surface a `not_checked_missing` warning in the review artifact, which the lead reads
during grade aggregation.

Override per repo in `.claude/loop.json`:

```jsonc
{
  "reviewers": {
    "ladder": ["A", "B", "Security"],
    "focus": {
      "Security": "Threat-model the new surface. Check auth, scope, audit log, secret handling, input validation. Review against SPEC-003 if present."
    }
  }
}
```

## Multidim preset

Set `reviewers.ladder` to an object with `preset: "multidim"` to expand the
ladder to three orthogonal narrow-dimension reviewers dispatched in parallel:

```jsonc
{
  "reviewers": {
    "ladder": { "preset": "multidim" }
  }
}
```

This resolves to ladder `["correctness", "test-coverage", "conventions"]`.
Each generated prompt:

- Declares **one dimension only** and explicitly forbids out-of-scope findings
  (scope-fence: "NOT in scope: …") to prevent overlap between parallel reviewers.
- Enforces a **hard budget** (≤15 tool calls, ≤8 min) with an inline-output
  fallback reminder per `docs/sop/specialist-pause-handling.md` — prevents
  the pause-without-artifact pattern seen in earlier demo runs.

### Multidim dimension focus areas

| Reviewer | Focus |
|---|---|
| correctness | Logic correctness, behavior preservation, race conditions, error-propagation. |
| test-coverage | Happy-path, partial-failure, and edge-case test coverage. Flag missing scenarios. |
| conventions | ESM/.mts parity, line caps, complexity ≤15, comment hygiene, banned patterns. |

### When to pick `multidim` vs default `["A", "B"]`

| Signal | Recommendation |
|---|---|
| Diff touches >5 files or >200 lines changed | Use `multidim` — parallel dimensions catch more in less wall-clock time. |
| Slice introduces new public API or schema | Use `multidim` — correctness + conventions reviewers both apply. |
| Large feature slice with complex acceptance criteria | Use `multidim` — test-coverage reviewer validates AC surface systematically. |
| Typo fix, single-line config change, doc-only update | Use default `["A", "B"]` — multidim cost overhead is not justified. |
| Quick iterative fixup (e.g. lint/format only) | Use default `["A", "B"]` or skip review ladder entirely (mark `review_skipped`). |

**Cost tradeoff**: multidim dispatches 3 concurrent reviewers (roughly 3× token
cost) but wall-clock time is `max(dim)` instead of `sum(dim)`. On large diffs
the quality gain outweighs the cost; on trivial diffs it is overkill.

The preset is opt-in per repo via `reviewers.ladder`. A follow-up CLAUDE.md
update will document the preset for autonomous-loop dispatch.

## Aggregation

Slice passes when all reviewers return `PASS` or `PASS with minor`. Any
single `FAIL` blocks slice complete. Orchestrator (lead) collects verdicts
+ summarizes before grading.

Each reviewer's prompt includes a step to:
1. Find prior decisions relevant to changed files (`/loop:decisions relevant --files`)
2. Link their review artifact back to the slice (`/loop:slice link`)

So the linkage arrays + decision-awareness build automatically as reviews
happen.

```

### docs/upstream-requests/2026-06-13-hero-crew-verdict-not-checked-author-judge.md

```
---
filed: 2026-06-13
target_plugin: hero-crew
target_repo: sergeymilashico/hero-crew
status: open
priority: P2
loop_tracking_feat: FEAT-180
related:
  - docs/upstream-requests/2026-06-10-hero-crew-specialist-pause-completion-enforcement.md
  - commands/slice-review-ladder.md (## Not checked section)
---

# Upstream-request: add not_checked[], author_id, and judge_id to write-review-result

## Filed against

- **Plugin:** hero-crew (`astra/crew/<version>`)
- **Component:** `scripts/crew.ts write-review-result` CLI + review artifact schema
- **Reason:** review artifacts currently have no structured field for "what was NOT examined,"
  no identity for who wrote the review, and no way to flag a self-approval (author == judge).
  These gaps cause false confidence and block meaningful grade aggregation.

## Problem

### 1. Missing not_checked field

Reviewers operate under bounded time and tool budgets (≤15 tool calls, ≤8 min for multidim).
They inevitably skip areas. Today there is no structured field for this; reviewers either
omit the gap silently or bury a disclaimer in `--risks`. The lead cannot distinguish
"Reviewer B examined security posture" from "Reviewer B said nothing about security and
the gap was invisible."

Consequence: grades on `security` and `production_readiness` dimensions carry undetected
confidence holes. The orchestrator aggregates verdicts without knowing the coverage surface.

### 2. Missing author_id

Review artifacts carry no identity for the agent or session that wrote them. If a review
is later disputed (incorrect PASS, missed regression), there is no traceable author to
correlate with the session transcript or cost report.

### 3. Missing judge_id / self-approval detection

When the same session writes both the builder handoff and the review artifact (self-review),
the verdict carries a structural conflict of interest. Today `write-review-result` does not
enforce or even surface this. A `judge_id` field compared against `author_id` on the
linked builder handoff would allow the loop to flag self-approvals and either reject them
or downgrade their weight in aggregation.

## Proposed changes

### CLI additions to `write-review-result`

```
crew write-review-result \
  --not-checked "<json-array-or-comma-list>" \
  --author-id  "<session-id or agent-label>" \
  --judge-id   "<session-id or agent-label>"
```

`--not-checked` accepts either:
- a JSON array string: `'["Performance benchmarks","Cross-platform compat"]'`
- a comma-separated plain string: `"Performance benchmarks, Cross-platform compat"`

Minimum cardinality: 1 item. Zero items → CLI emits a stderr warning
`not_checked_missing: reviewer did not declare skipped areas`. The artifact is
still written (non-blocking) so gate flow is not interrupted, but the warning is
recorded in the artifact frontmatter as `not_checked_warning: true`.

### Review artifact schema additions

```yaml
# existing fields (unchanged)
decision: PASS
summary: "..."
evidence: "..."
# new fields
not_checked:
  - "Performance characteristics of the implementation"
  - "Cross-platform compatibility beyond CI test environment"
author_id: "session-abc123"          # who wrote this review
judge_id:  "session-abc123"          # who is judging (usually same as author)
self_approval: false                 # true when author_id == builder_author_id
```

`self_approval` is computed by `write-review-result` if it can read the linked builder
handoff from the same slice. If the handoff is absent, `self_approval` defaults to `null`
(indeterminate) rather than `false`.

### Grade aggregation impact

When `loop:slice grade` reads review artifacts:

- If `not_checked_warning: true` → subtract 0.05 from `test_confidence` and
  `production_readiness` dimensions (reviewer declared unknown coverage).
- If `self_approval: true` → flag the grade with `self_review_detected: true`
  and surface a `needs-review` suggestion to the lead.

## Motivation — AgentOps verdict schema alignment

The [AgentOps verdict schema](https://www.agentops.ai) distinguishes between a verdict
(binary PASS/FAIL) and a verdict *surface* (what was actually examined). Without
`not_checked[]`, loop review artifacts carry a verdict without a surface — equivalent to
a test run that reports pass/fail but hides which tests ran.

`author_id` + `judge_id` align with the principle that multi-agent pipelines must carry
provenance at every artifact boundary. A review with no author is forensically opaque.

## Prior art in this repo

- `docs/upstream-requests/2026-06-10-hero-crew-specialist-pause-completion-enforcement.md`
  — proposes `incomplete: true` / `artifactPath: null` flags in dispatch result for
  similar "completeness of artifact" motivation.
- `commands/slice-review-ladder.md` — the `## Not checked` section added in FEAT-180
  is the doc-side contract; this upstream-request formalizes the schema and CLI side.

## Acceptance criteria (for hero-crew implementation)

- **AC-1**: `write-review-result` accepts `--not-checked`, `--author-id`, `--judge-id` flags.
- **AC-2**: review artifact YAML frontmatter includes `not_checked[]`, `author_id`,
  `judge_id`, `self_approval` fields.
- **AC-3**: passing `--not-checked` with zero items emits a stderr warning and sets
  `not_checked_warning: true` in frontmatter; artifact is still written.
- **AC-4**: `self_approval` is computed when the linked builder handoff is readable;
  defaults to `null` when the handoff is absent.
- **AC-5**: `loop:slice grade` applies the `not_checked_warning` and `self_approval`
  dimension adjustments described above (or loop-side companion FEAT handles it).
- **AC-6**: tests cover: normal write with all new flags, write with empty
  `--not-checked` (warning path), self-approval detection (same author == builder).

## Loop-side coordination

When this lands, the loop plugin will:

1. Update reviewer prompts in `src/scripts/lib/reviewer-ladder.mts` to pass
   `--not-checked "$(items from ## Not checked section)"` in the `crew write-review-result`
   command block.
2. Update `src/scripts/loop.mts slice grade` to read `not_checked_warning` and
   `self_approval` from review artifact frontmatter.
3. Bump `MIN_CREW_VERSION` in `src/scripts/lib/plugin-identity.mts` to the hero-crew
   release that ships these fields.

## How to mark resolved

When the CLI flags and schema fields are shipped upstream, update this file's frontmatter:

```yaml
status: resolved-by-upstream
resolved: <date>
resolved_by: hero-crew vN.M.K — write-review-result --not-checked/--author-id/--judge-id
```

```

## Files read

