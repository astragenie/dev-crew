---
id: FEAT-010
status: in-progress
priority: P0
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-19
depends_on: []
slices: [SLICE-28]
derived_from: null
pm_customer_impact: 0.85
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.6
pm_technical_risk: 0.2
pm_dependency_depth: 0.2
pm_composite_priority: P0
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "High customer_impact from a confirmed, unbounded, self-escalating defect (fresh tracker issue spam on every rerun) drives P0 via the impact>=0.8-and-defect-class branch, even though the fix itself is genuinely low technical_risk (1-2 files, known pattern, trivial revert) -- exactly the 'weigh risk accordingly' case flagged going in: severity comes from blast radius/recurrence, not code-change danger. Low effort and low risk keep it autonomous-safe."
tags: ["stack:typescript", "area:backlog-data-model", "concern:bugfix"]
needs_contract: false
needs_ux: false
started_at: 2026-08-19
---
## Description

Carried from runner-plugin FEAT-299 (proposed-slices.mts validation gaps made load-bearing by SLICE-192's identity keying) after P0 parent-estate settlement, full scope -- SLICE-207 was never built in runner-plugin (verified: no worktree, no branch, no dispatch result, no merge commit on main), per dev-crew's own DEC-001 ('SLICE-207/FEAT-299 disposition is carry, not build'). Two gaps in src/scripts/lib/proposed-slices.mts, both now load-bearing because SLICE-192 (shipped, see FEAT-284) replaced count-based slice materialization with identity keying via a proposed_slice_id_suffix frontmatter stamp, with the ~200 pre-existing slices falling back to an exact title-match against proposed_slices[].title. Gap A: no uniqueness validation on proposed_slices[].title or id_suffix within a FEAT -- a duplicate title makes matchProposedIdSuffix's .find() collapse two legacy slices onto one id_suffix (recreating a FEAT-284-class duplicate-slice bug through a different door), while a duplicate id_suffix silently swallows one proposed entry so it is never created at all. Gap B (worse): clampSliceTitle trims whitespace before storing a slice's title, but proposed-slices.mts validates the raw untrimmed string, so a proposed title with leading/trailing whitespace can never === match its own stored entry on the legacy fallback -- causing an UNBOUNDED duplicate-recreation loop on every rerun of slice from-feature, each iteration publishing a fresh tracker issue (loop.mts:1567-1574), the same mechanism that turned the original FEAT-284 duplicate into GitHub issue 598. Acceptance direction: trim before validating/storing (or compare trimmed on the fallback path) plus a regression test asserting no growth across repeated reruns; add uniqueness validation on both title and id_suffix within a FEAT's proposed_slices, rejecting with a message naming the duplicate; scan the existing backlog for pre-existing duplicates before enabling the check so it does not fail CI on historical data unannounced.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a proposed slice title with leading/trailing whitespace (e.g. ' Library core'), When it is validated against its own stored (trimmed) entry via the legacy title-match fallback, Then the trimmed comparison succeeds and the slice is recognized as already-materialized instead of being recreated.
- AC-2: Given a FEAT's proposed_slices containing two entries with the same title (or the same id_suffix), When materializeProposedSlices validates the array, Then it rejects with an error message naming the specific duplicate title or id_suffix, rather than silently collapsing them via .find() or silently swallowing the second entry.
- AC-3: Given the existing backlog corpus, When the pre-existing-duplicate scan runs BEFORE the uniqueness check is enabled, Then it reports any historical duplicates found so they can be resolved or explicitly grandfathered, and CI does not fail unannounced on historical data.
- AC-4: Given a regression test that reruns slice-from-feature 3+ times against the same FEAT with a deliberately-untrimmed proposed title, When the test asserts on proposed-slice count, Then it shows zero growth across reruns (closing the GitHub-issue-598-class unbounded loop).
