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

Fix defect (3) of the three in FEAT-283: the legacy grandfather clause is
unbounded, so it silently satisfies the gate for artifacts written today.

`review-gate.mts:109-118` treats ANY artifact with no `decision` frontmatter key
as "legacy … grandfathered pre-P1.3" and returns `satisfied: true`. There is no
date bound, so the clause applies to an artifact written this minute.

SLICE-181 and SLICE-182 both closed through this path on 2026-08-04. Neither
review artifact has frontmatter at all — only a bold `**Decision: PASS**` line in
the body. Those two happened to be approvals. **A prose-only rejection would have
closed the slice just as silently**, which is the actual risk.

## Approach — decided 2026-08-05: DELETE the clause, do not bound it

The slice title says "bound by date/marker cutoff". Superseded by an explicit
decision: **remove the grandfather clause entirely.** No cutoff date, no marker,
no date-conditional branch.

Rationale. A date cutoff is a permanent special case added to the gate-of-gates
to accommodate artifacts nobody cares about any more. It would need a magic
constant, a documented rationale, and tests on both sides of it, forever — to
preserve behavior for a closed set of historical files. Deleting the branch is
less code, has no constant to justify, and leaves one rule: an artifact without a
`decision` key does not prove a review happened.

The retroactive-un-close risk I raised earlier was overweighted, and the record
should say so. `deriveReviewGate` runs at close time. Already-closed slices are
never re-evaluated, so removing the clause cannot un-close anything historical —
it changes only future closes.

## In scope

- `src/scripts/lib/review-gate.mts` — delete the `verdict.decision === null`
  branch at `:109-118`. A frontmatter-less artifact must fall through to
  `unproven` (gate NOT satisfied) with a message saying the artifact carries no
  `decision` key and how to fix it.
- Remove the now-dead `legacy` field from `ReviewGateResult` (`:77-78`) and any
  consumer that reads it. Leaving a permanently-false flag behind is the kind of
  vestige this slice exists to remove.
- Update the module header comment at `:12-13`, which documents the
  grandfathering behavior.
- Tests: a frontmatter-less artifact is unproven; the SLICE-181/182 shape
  specifically (no frontmatter at all, prose `**Decision: PASS**` in the body) is
  unproven; artifacts WITH a decision key are unaffected in every branch.

## Before you delete — one check, not a blocker

Report how many artifacts under `.claude/artifacts/crew/reviews/` lack a
`decision` key, and whether any belongs to a slice that is still open. Closed
slices are unaffected by construction. If an OPEN slice's only review artifact is
frontmatter-less, name it — that slice will need a re-review or an explicit
`review_skipped` badge, and the operator should hear it from you rather than
discover it at close time.

## Out of scope

- Verdict vocabulary (SLICE-200) and artifact sort order (SLICE-201).
- The absence-tolerated branch at `:142-150`. It is a different rule — no
  artifact at all, versus an artifact that proves nothing — and it carries its
  own P2 join-key reasoning. Do not fold it in.
- Do not rewrite or backfill existing review artifacts.

## Acceptance criteria

Scoped from FEAT-283's set to defect (3) only. ACs 1-2 shipped in SLICE-200;
ACs 3-4 belong to SLICE-201.

- [ ] AC-1: Given a review artifact with no `decision` frontmatter key, when `review-gate.mts` evaluates it, then it is unproven (gate NOT satisfied), regardless of the artifact's date — no cutoff, no marker, no date-conditional branch anywhere in the resolution path.
- [ ] AC-2: Given the SLICE-181 / SLICE-182 shape specifically — no frontmatter at all, only a prose `**Decision: PASS**` line in the body — when evaluated, then it is unproven, and the message names the missing `decision` key and the remedy.
- [ ] AC-3: Given the grandfather branch is gone, when `ReviewGateResult` is inspected, then the `legacy` field and every consumer of it are removed too — no permanently-false flag left behind.
- [ ] AC-4: Given an artifact that DOES carry a `decision` key, when evaluated, then behavior is unchanged in every branch — satisfied, rejected, and unrecognized (SLICE-200) all still resolve as before.
- [ ] AC-5: Given the absence-tolerated branch at `:142-150`, when this slice lands, then it is untouched — no artifact at all remains a distinct case from an artifact that proves nothing.
- [ ] AC-6: Given the live corpus, when the change is made, then the count of frontmatter-less artifacts is reported along with whether any belongs to a still-OPEN slice; any such slice is named so it can be re-reviewed or given an explicit `review_skipped` badge.
- [ ] AC-7: Given the module header at `:12-13` documents grandfathering, when the branch is deleted, then the comment is updated to match.
- [ ] AC-8: Full suite green; typecheck + lint + format clean.

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
