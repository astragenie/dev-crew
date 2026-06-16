---
filed: 2026-06-13
target_plugin: hero-crew
target_repo: astragenie/dev-team
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
