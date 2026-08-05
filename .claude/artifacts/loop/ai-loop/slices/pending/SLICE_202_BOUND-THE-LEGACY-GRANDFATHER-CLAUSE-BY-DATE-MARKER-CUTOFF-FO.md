---
id: SLICE-202
title: Bound the legacy grandfather clause by date/marker cutoff for frontmatter-less artifacts
status: pending
feature: FEAT-283
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-05
updated: 2026-08-05
effort_points: 2
estimated_tokens: 100000
github_issue: 622
github_url: "https://github.com/astragenie/runner-plugin/issues/622"
---
# SLICE-202: Bound the legacy grandfather clause by date/marker cutoff for frontmatter-less artifacts

Implements FEAT-283. See [feature file](../../../backlog/in-progress/FEAT-283.md) for product context.

## Objective

Review-gate verdict handling has three defects, all observed live while closing SLICE-178 through SLICE-182 on 2026-08-04.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-283 and shared across 3 sibling slices — scope per-slice before close

- [ ] Given a review artifact whose decision value is not in {approved, approved_with_notes, rejected} (e.g. "PASS"), when review-gate.mts evaluates it, then it reports an 'unrecognized verdict' message naming the offending value and the accepted vocabulary, distinct from the rejected-verdict message and remedy.
- [ ] Given failure-classifier.mts's PASS_VERDICTS already treats 'pass' as valid, when review-gate.mts's REVIEW_SATISFIED set is evaluated for the same value, then the two modules agree on accepted verdict vocabulary, or the discrepancy is explicitly documented as intentional.
- [ ] Given multiple review artifacts for one slice with differing filesystem mtimes but ISO timestamps in their filenames, when artifact-verdict.mts selects the newest, then it parses and sorts by the filename timestamp, falling back to mtime only when no timestamp is present in the name.
- [ ] Given a fresh git clone/checkout/worktree where mtimes are arbitrary, when newest-review selection runs against a multi-review slice, then the result matches filename-timestamp order, not filesystem mtime order.
- [ ] Given a review artifact written after the grandfather-clause cutoff with no 'decision' frontmatter key, when review-gate.mts evaluates it, then it is treated as unproven (gate not satisfied) rather than silently grandfathered.
- [ ] Given a review artifact written before the grandfather-clause cutoff with no 'decision' frontmatter key, when review-gate.mts evaluates it, then the existing legacy-grandfather behavior still applies, with no regression for genuinely pre-P1.3 artifacts.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-283 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
