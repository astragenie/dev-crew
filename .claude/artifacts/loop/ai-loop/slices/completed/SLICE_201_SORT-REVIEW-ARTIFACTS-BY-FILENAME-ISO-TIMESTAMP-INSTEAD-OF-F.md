---
id: SLICE-201
title: Sort review artifacts by filename ISO timestamp instead of filesystem mtime
status: completed
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
github_issue: 620
github_url: "https://github.com/astragenie/runner-plugin/issues/620"
completed_at: 2026-08-05
---
# SLICE-201: Sort review artifacts by filename ISO timestamp instead of filesystem mtime

Implements FEAT-283. See [feature file](../../../backlog/in-progress/FEAT-283.md) for product context.

## Objective

Fix defect (2) of the three in FEAT-283: newest-review selection sorts by
filesystem mtime and ignores the ISO timestamp already present in the filename.

`artifact-verdict.mts:30-44` stats each candidate and sorts on `mtimeMs`. Review
filenames already carry the authoritative ordering:

    20260803T200500Z-review-result-slice-178-...

mtime is not durable. `git clone`, `checkout`, `cherry-pick` and worktree
materialization all assign arbitrary mtimes, so on a fresh clone the ordering
for a multi-review slice is effectively random and a superseded rejection can
outrank its own later approval.

Reproduced accidentally on 2026-08-04: editing the older artifact after the
newer one flipped the gate verdict from approved to rejected with no content
change on either file.

## In scope

- `src/scripts/lib/artifact-verdict.mts` — parse the leading ISO timestamp from
  the basename and sort on it; fall back to `mtimeMs` only when a filename
  carries no parseable timestamp.
- Mixed-corpus behavior: some filenames have a timestamp and some do not. Define
  and test the ordering rule for that case rather than leaving it emergent.
- Tests that set mtimes DELIBERATELY OPPOSITE to filename order and assert
  filename order wins. A test where both orderings agree proves nothing — that
  is how this shipped.

## Out of scope

- The verdict-vocabulary branch in `review-gate.mts` — shipped in SLICE-200.
- The grandfather-clause cutoff (`review-gate.mts:109-118`) — SLICE-202.
- Changing the review-artifact filename convention itself.

## Acceptance criteria

Scoped from FEAT-283's set to defect (2) only. ACs 1-2 shipped in SLICE-200;
ACs 5-6 belong to SLICE-202.

- [ ] AC-1: Given multiple review artifacts for one slice with differing filesystem mtimes but ISO timestamps in their filenames, when artifact-verdict.mts selects the newest, then it parses and sorts by the filename timestamp, falling back to mtime only when no timestamp is present in the name.
- [ ] AC-2: Given a fresh git clone/checkout/worktree where mtimes are arbitrary, when newest-review selection runs against a multi-review slice, then the result matches filename-timestamp order, not filesystem mtime order.
- [ ] AC-3: Given a test corpus whose mtimes are set DELIBERATELY OPPOSITE to filename order, when selection runs, then filename order wins — asserted with the two orderings in conflict, since a test where they agree cannot detect this defect.
- [ ] AC-4: Given a mixed corpus where some filenames carry a parseable timestamp and some do not, when selection runs, then the ordering rule for that case is defined and asserted rather than left emergent.
- [ ] AC-5: Full suite green; typecheck + lint + format clean.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- **FEAT-283 stays in `in-progress/`** unless this is the last open sibling — only the final slice moves the feature to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
