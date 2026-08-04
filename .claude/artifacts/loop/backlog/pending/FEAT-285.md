---
id: FEAT-285
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
---
## Description

github-sync publishes a duplicate parent FEAT issue for every child slice when a FEAT is sliced before it has a github_issue. Reproduced live 2026-08-04 on FEAT-284.

Repro. FEAT-284 was created via intake from-text and scored via backlog pm-apply, neither of which publishes a GitHub issue, so the FEAT reached slicing with no github_issue in frontmatter. slice from-feature then materialized its 6 proposed slices, and the run emitted: publishSlice SLICE-188 -> #600 (sub of #599), SLICE-189 -> #602 (sub of #601), SLICE-190 -> #604 (sub of #603), SLICE-191 -> #606 (sub of #605), SLICE-192 -> #608 (sub of #607), SLICE-193 -> #610 (sub of #609). Six identical parent issues (#599, #601, #603, #605, #607, #609), all titled FEAT-284, one created per child publish. The FEAT frontmatter ended up stamped with github_issue: 609, the last one, leaving five orphaned duplicates open and unreferenced.

Root cause hypothesis. publishSlice ensures its parent FEAT issue exists before creating the child, but the newly created parent id is not persisted back to the FEAT frontmatter (or not re-read from an in-memory cache) between sibling publishes inside the same run. Each iteration therefore observes an unpublished FEAT and creates the parent again. The per-run loop over proposed slices needs to publish the parent at most once and reuse the resulting id for every sibling, ideally stamping github_issue on the FEAT immediately after the first parent creation so a crash mid-run does not orphan it either.

Blast radius. Every FEAT sliced without a pre-existing github_issue produces N-1 orphan parent issues, where N is its slice count. Any tracker automation, milestone rollup or DORA leadTime metric keyed on FEAT issues double-counts. On a public repo this is visible noise. Cleanup is manual: the five duplicates from this repro were closed by hand as not-planned with a pointer to the surviving id.

Secondary observation, lower severity. The auto-generated FEAT issue title is the entire first paragraph of the intake free-text rather than a short title -- #609's original title ran to three sentences. intake from-text should derive a bounded title (or the publisher should truncate) rather than pasting the whole opening paragraph as the issue subject.

Acceptance direction. Given a FEAT with no github_issue and N proposed slices, when slice from-feature runs, then exactly one parent FEAT issue is created, its id is stamped on the FEAT frontmatter before any child publish, and all N child issues are created as subs of that single parent.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.