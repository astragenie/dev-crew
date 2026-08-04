---
id: FEAT-285
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.38
pm_strategic_alignment: 0.7
pm_technical_risk: 0.35
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-04
autonomous_safe: true
triage_notes: "Live-fired, deterministic, cleanly root-caused via direct code read (not just the FEAT's own hypothesis) — that argues for real priority, not P3/P4. But weighed honestly against this session's P1s: FEAT-284 is live data loss (a whole slice silently dropped), FEAT-283 is review-gate verdict defects (corrupts a gating decision), FEAT-281 closes a tested-but-never-wired CI gap. FEAT-285 creates external noise (orphan GitHub issues) and double-counts any tracker/DORA metric keyed on FEAT issues, but it never drops or corrupts actual engineering work, and cleanup — while manual — is mechanical (close the duplicates, keep the last-stamped id). That places it just above FEAT-282 (P2, currently inert/blocks nothing) since FEAT-285 actively fires and pollutes external state each time it triggers, but below the P1 tier reserved for data-loss/gating-correctness defects. Fix is bounded to one loop + one write path with a precise, already-identified mechanism, keeping effort_estimate and technical_risk moderate-low."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Publish parent FEAT issue once per slice run; stamp github_issue before child publishes
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: "Regression test: N sibling slice publishes create exactly one parent FEAT issue"
    points: 1
    estimated_tokens: 60000
  - id_suffix: -SLICE-3
    title: Truncate auto-generated FEAT issue title instead of pasting full intake paragraph
    points: 1
    estimated_tokens: 60000
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
## Acceptance criteria (Given-When-Then)

- Given a FEAT with no github_issue and N proposed slices, when slice from-feature publishes the slices, then exactly one parent FEAT issue is created and all N child issues are attached as subs of that single parent.
- Given the parent FEAT issue is created during the first child publish, when subsequent sibling publishes run later in the same process, then they observe the stamped github_issue (via cache invalidation or an explicitly passed-in parent id) and skip re-creating the parent.
- Given a crash or interruption after the first parent issue is created but before all children publish, when the run is resumed, then the FEAT frontmatter already has github_issue stamped so no new parent is created on retry.
- Given the existing single-slice and single-feature publish call sites (publishFeatureViaProvider, publishSliceViaProvider at loop.mts:903/1453/2054), when this fix lands, then their existing idempotent behavior is unchanged, covered by a regression test.
- Given a FEAT created via intake free-text with a multi-sentence opening paragraph, when its GitHub issue title is generated, then the title is bounded/truncated rather than pasting the entire paragraph verbatim.

## Proposed slices (PM decomposition)

- SLICE-1: Publish parent FEAT issue once per slice run; stamp github_issue before child publishes (2 pts)
- SLICE-2: Regression test: N sibling slice publishes create exactly one parent FEAT issue (1 pts)
- SLICE-3: Truncate auto-generated FEAT issue title instead of pasting full intake paragraph (1 pts)
