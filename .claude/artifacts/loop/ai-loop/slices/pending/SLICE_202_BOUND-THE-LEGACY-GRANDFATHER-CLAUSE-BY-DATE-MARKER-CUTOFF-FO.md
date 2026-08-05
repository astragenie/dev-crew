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

## In scope

- `src/scripts/lib/artifact-verdict.mts` / `review-gate.mts` — bound the clause
  by artifact date or an explicit marker. Frontmatter-less artifacts written
  after the cutoff are `unproven` (gate NOT satisfied), not grandfathered.
- Genuinely pre-P1.3 artifacts keep today's behavior — no regression.
- The cutoff value and its rationale recorded in-code where a reader will find
  it, not buried in a commit message.
- Tests for both sides of the cutoff, plus the SLICE-181/182 shape specifically
  (no frontmatter, prose `**Decision: PASS**` in the body).

## Out of scope

- Verdict vocabulary (SLICE-200) and artifact sort order (SLICE-201).
- The absence-tolerated branch at `:142-150` — that is P2 join-key work and its
  own decision; do not fold it into this cutoff.

## Risk note — read before choosing a cutoff

This is the highest-risk slice of the three. Every gate in this repo runs through
`deriveReviewGate`, and a cutoff set too aggressively retroactively un-closes
historical slices whose artifacts are legitimately frontmatter-less. Establish
how many existing artifacts under `.claude/artifacts/crew/reviews/` lack a
`decision` key and what their date range is BEFORE picking the date — measure the
corpus first, then choose.

FEAT-283 is marked `autonomous_safe: false` specifically so a human confirms this
cutoff. Surface the proposed date and the affected-artifact count for approval
rather than picking one and proceeding.

## Acceptance criteria

Scoped from FEAT-283's set to defect (3) only. ACs 1-2 shipped in SLICE-200;
ACs 3-4 belong to SLICE-201.

- [ ] AC-1: Given a review artifact written after the grandfather-clause cutoff with no 'decision' frontmatter key, when review-gate.mts evaluates it, then it is treated as unproven (gate not satisfied) rather than silently grandfathered.
- [ ] AC-2: Given a review artifact written before the grandfather-clause cutoff with no 'decision' frontmatter key, when review-gate.mts evaluates it, then the existing legacy-grandfather behavior still applies, with no regression for genuinely pre-P1.3 artifacts.
- [ ] AC-3: Given the live corpus under `.claude/artifacts/crew/reviews/`, when the cutoff is chosen, then the count of existing frontmatter-less artifacts and their date range is MEASURED and reported first, and the proposed cutoff date is surfaced for human approval before being adopted (FEAT-283 is `autonomous_safe: false` for this reason).
- [ ] AC-4: Given the SLICE-181 / SLICE-182 artifact shape specifically — no frontmatter at all, only a prose `**Decision: PASS**` line in the body — when evaluated against the chosen cutoff, then the outcome is asserted explicitly in a test.
- [ ] AC-5: Given the cutoff value, when a future reader looks for its rationale, then it is recorded in-code at the decision site, not only in a commit message.
- [ ] AC-6: Full suite green; typecheck + lint + format clean.

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
