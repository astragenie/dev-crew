---
id: FEAT-283
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-05
depends_on: []
slices: [SLICE-200, SLICE-201, SLICE-202]
derived_from: null
pm_customer_impact: 0.85
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.9
pm_technical_risk: 0.45
pm_dependency_depth: 0.2
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-04
autonomous_safe: false
triage_notes: "Highest customer_impact and strategic_alignment of the three: this is a currently-active defect in the review gate itself, the single mechanism every other slice's close depends on, and it has already caused two silent-pass closes today. Effort is comparatively low (three localized, well-understood fixes) which is why it isn't P0, but the risk of touching gate-of-gates logic is real enough to flag autonomous_safe=false so a human confirms the grandfather-clause cutoff and sort-key fallback before this merges — getting this fix wrong reproduces the exact failure class it's fixing, one layer deeper."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Add unrecognized-verdict branch to review-gate.mts; reconcile vocab with failure-classifier
    points: 1
    estimated_tokens: 60000
  - id_suffix: -SLICE-2
    title: Sort review artifacts by filename ISO timestamp instead of filesystem mtime
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: Bound the legacy grandfather clause by date/marker cutoff for frontmatter-less artifacts
    points: 2
    estimated_tokens: 100000
tags: [be, workflow]
needs_contract: true
needs_ux: false
started_at: 2026-08-05
github_issue: 621
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/621"
slices_complete: [SLICE-200]
---
## Description

Review-gate verdict handling has three defects, all observed live while closing SLICE-178 through SLICE-182 on 2026-08-04.

(1) Unrecognized verdicts are reported as rejections. review-gate.mts:119 tests REVIEW_SATISFIED.has(verdict.decision) against the set {approved, approved_with_notes}; anything else falls through to the rejected branch at :126, whose message reads 'a rejected review cannot close'. A reviewer that wrote 'decision: PASS' produced the self-contradicting output 'review artifact decision: PASS - a rejected review cannot close'. Unrecognized and rejected are different conditions and must not share a message or a remedy: rejected means fix the code, unrecognized means fix the artifact. Add a third branch naming the offending value and listing the accepted vocabulary. Consider accepting case-insensitive matches; note failure-classifier.mts:64 already uses PASS_VERDICTS = {pass, approved, approved_with_notes}, so two modules in this repo disagree today on whether 'pass' is a valid verdict.

(2) Newest-artifact selection uses filesystem mtime, not the ISO timestamp already present in the filename. artifact-verdict.mts:32-44 stats each file and sorts by mtimeMs. Review filenames are 20260803T200500Z-review-result-slice-178-... so the authoritative ordering is right there in the name and is being ignored. mtime is not durable: git clone, checkout, cherry-pick and worktree materialization all assign arbitrary mtimes, so on a fresh clone the review ordering for a multi-review slice is effectively random and a superseded rejection can outrank its own approval. Reproduced accidentally in this session: editing the older artifact after the newer one flipped the gate verdict from approved to rejected with no content change. Parse the leading timestamp from the basename and sort on it, falling back to mtime only when absent.

(3) The legacy grandfather clause is unbounded and silently satisfies the gate for new artifacts. review-gate.mts:109-118 treats any artifact with no 'decision' frontmatter key as 'legacy ... grandfathered pre-P1.3' and returns satisfied: true. The clause has no date bound, so it applies to artifacts written today. SLICE-181 and SLICE-182 both closed through this path on 2026-08-04: their review artifacts have no frontmatter at all, only a bold '**Decision: PASS**' line in the body. Those two happened to be approvals, but a prose-only rejection would close the slice just as silently. Bound the clause by artifact date or by a marker, and treat frontmatter-less artifacts written after the cutoff as unproven rather than satisfied.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- Given a review artifact whose decision value is not in {approved, approved_with_notes, rejected} (e.g. "PASS"), when review-gate.mts evaluates it, then it reports an 'unrecognized verdict' message naming the offending value and the accepted vocabulary, distinct from the rejected-verdict message and remedy.
- Given failure-classifier.mts's PASS_VERDICTS already treats 'pass' as valid, when review-gate.mts's REVIEW_SATISFIED set is evaluated for the same value, then the two modules agree on accepted verdict vocabulary, or the discrepancy is explicitly documented as intentional.
- Given multiple review artifacts for one slice with differing filesystem mtimes but ISO timestamps in their filenames, when artifact-verdict.mts selects the newest, then it parses and sorts by the filename timestamp, falling back to mtime only when no timestamp is present in the name.
- Given a fresh git clone/checkout/worktree where mtimes are arbitrary, when newest-review selection runs against a multi-review slice, then the result matches filename-timestamp order, not filesystem mtime order.
- Given a review artifact written after the grandfather-clause cutoff with no 'decision' frontmatter key, when review-gate.mts evaluates it, then it is treated as unproven (gate not satisfied) rather than silently grandfathered.
- Given a review artifact written before the grandfather-clause cutoff with no 'decision' frontmatter key, when review-gate.mts evaluates it, then the existing legacy-grandfather behavior still applies, with no regression for genuinely pre-P1.3 artifacts.

## Proposed slices (PM decomposition)

- SLICE-1: Add unrecognized-verdict branch to review-gate.mts; reconcile vocab with failure-classifier (1 pts)
- SLICE-2: Sort review artifacts by filename ISO timestamp instead of filesystem mtime (2 pts)
- SLICE-3: Bound the legacy grandfather clause by date/marker cutoff for frontmatter-less artifacts (2 pts)
