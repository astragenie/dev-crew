---
id: SLICE-200
title: Add unrecognized-verdict branch to review-gate.mts; reconcile vocab with failure-classifier
status: completed
feature: FEAT-283
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-05
updated: 2026-08-05
effort_points: 1
estimated_tokens: 60000
github_issue: 618
github_url: "https://github.com/astragenie/runner-plugin/issues/618"
completed_at: 2026-08-05
---
# SLICE-200: Add unrecognized-verdict branch to review-gate.mts; reconcile vocab with failure-classifier

Implements FEAT-283. See [feature file](../../../backlog/in-progress/FEAT-283.md) for product context.

## Objective

Fix defect (1) of the three in FEAT-283: `review-gate.mts` reports an
**unrecognized** verdict as a **rejection**.

`review-gate.mts:119` tests `REVIEW_SATISFIED.has(verdict.decision)` against
`{approved, approved_with_notes}`; anything else falls through to the branch at
`:126` whose message reads *"a rejected review cannot close"*. A reviewer that
wrote `decision: PASS` produced the self-contradicting line:

```
review artifact decision: PASS — a rejected review cannot close
```

Unrecognized and rejected are different conditions with different remedies:
rejected means *fix the code*, unrecognized means *fix the artifact*. They must
not share a message.

Second half of the same defect: `failure-classifier.mts:64` already defines
`PASS_VERDICTS = {pass, approved, approved_with_notes}`. Two modules in this
repo disagree today on whether `pass` is a valid verdict. That disagreement is
the reason every reviewer dispatch in the 2026-08-04 session needed the accepted
vocabulary hand-written into its brief.

## In scope

- `src/scripts/lib/review-gate.mts` — add a third, distinct branch for verdicts
  that are neither in `REVIEW_SATISFIED` nor a recognized rejection. Message must
  name the offending value AND list the accepted vocabulary.
- Reconcile the accepted-verdict vocabulary between `review-gate.mts` and
  `failure-classifier.mts` — either share one exported constant, or document the
  divergence as intentional in a comment at both sites.
- Case-insensitive matching for verdict values (`PASS` / `pass` / `Approved`).
- Tests covering: unrecognized verdict, recognized rejection, and each accepted
  verdict spelling — asserting the unrecognized and rejected paths produce
  DIFFERENT `reason` strings.

## Out of scope

- **Artifact sort order / `artifact-verdict.mts`** — that is SLICE-201.
- **Grandfather-clause cutoff** (`review-gate.mts:109-118`) — that is SLICE-202.
  Do not bound, date-gate, or otherwise alter the `decision === null` branch.
- Absence-tolerated behavior at `:142-150` (P2 join-key work, unchanged).
- Rewriting existing off-schema review artifacts.

## Acceptance criteria

Scoped from FEAT-283's set to defect (1) only. The remaining four FEAT-level ACs
belong to SLICE-201 (sort order) and SLICE-202 (grandfather cutoff).

- [ ] AC-1: Given a review artifact whose decision value is not in {approved, approved_with_notes, rejected} (e.g. "PASS"), when `review-gate.mts` evaluates it, then it reports an 'unrecognized verdict' message naming the offending value and the accepted vocabulary, distinct from the rejected-verdict message and remedy.
- [ ] AC-2: Given `failure-classifier.mts`'s `PASS_VERDICTS` already treats 'pass' as valid, when `review-gate.mts`'s `REVIEW_SATISFIED` set is evaluated for the same value, then the two modules agree on accepted verdict vocabulary, or the discrepancy is explicitly documented as intentional at both sites.
- [ ] AC-3: Given a verdict differing only in case from an accepted value, when the gate evaluates it, then it is treated as that accepted value.
- [ ] AC-4: Given the live repro — a review artifact carrying `decision: PASS` — when `slice complete` runs against it, then the close is NOT blocked with a rejection message. Verified against a real artifact under `.claude/artifacts/crew/reviews/`, not a fixture alone.
- [ ] AC-5: Full suite green; typecheck + lint + format clean.

## Done When

- AC-1 through AC-5 PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- **FEAT-283 stays in `in-progress/`** — SLICE-201 and SLICE-202 are still open.
  Only the final sibling slice moves the feature to `done/`.
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: `crew:reviewer` — correctness of the branch split; verify the
  unrecognized and rejected paths cannot collapse to one message; verify no
  behavior change to the grandfather or absence branches.
