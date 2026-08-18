---
id: FEAT-010
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: []
slices: []
derived_from: null
---
## Description

Carried from runner-plugin FEAT-299 (proposed-slices.mts validation gaps made load-bearing by SLICE-192's identity keying) after P0 parent-estate settlement, full scope -- SLICE-207 was never built in runner-plugin (verified: no worktree, no branch, no dispatch result, no merge commit on main), per dev-crew's own DEC-001 ('SLICE-207/FEAT-299 disposition is carry, not build'). Two gaps in src/scripts/lib/proposed-slices.mts, both now load-bearing because SLICE-192 (shipped, see FEAT-284) replaced count-based slice materialization with identity keying via a proposed_slice_id_suffix frontmatter stamp, with the ~200 pre-existing slices falling back to an exact title-match against proposed_slices[].title. Gap A: no uniqueness validation on proposed_slices[].title or id_suffix within a FEAT -- a duplicate title makes matchProposedIdSuffix's .find() collapse two legacy slices onto one id_suffix (recreating a FEAT-284-class duplicate-slice bug through a different door), while a duplicate id_suffix silently swallows one proposed entry so it is never created at all. Gap B (worse): clampSliceTitle trims whitespace before storing a slice's title, but proposed-slices.mts validates the raw untrimmed string, so a proposed title with leading/trailing whitespace can never === match its own stored entry on the legacy fallback -- causing an UNBOUNDED duplicate-recreation loop on every rerun of slice from-feature, each iteration publishing a fresh tracker issue (loop.mts:1567-1574), the same mechanism that turned the original FEAT-284 duplicate into GitHub issue 598. Acceptance direction: trim before validating/storing (or compare trimmed on the fallback path) plus a regression test asserting no growth across repeated reruns; add uniqueness validation on both title and id_suffix within a FEAT's proposed_slices, rejecting with a message naming the duplicate; scan the existing backlog for pre-existing duplicates before enabling the check so it does not fail CI on historical data unannounced.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.