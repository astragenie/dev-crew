---
id: FEAT-293
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.45
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.55
pm_technical_risk: 0.3
pm_dependency_depth: 0.15
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-06
autonomous_safe: true
triage_notes: "Residual nondeterminism after SLICE-201's mtime-to-filename sort fix: 9 hyphenated-date-only and 2 compact-date-only review-artifact filenames all parse to UTC midnight, so same-slice same-day ties fall through to fs.readdir() order (review-gate.mts:84), and mixed date-only/full-ISO pairs can let a superseded verdict outrank its successor. Not hypothetical — the corpus check found agents actively producing both shapes today (2026-08-04-review-slice-200.md vs SLICE-201's own compact-ISO artifact), so the 11 date-only files are not a closed historical set. Same defect class as FEAT-283 item 2 with a different nondeterminism source. Fix is contained to artifact-verdict.mts plus pinning the convention in reviewer/validator-facing instructions and two new fixture tests — moderate, well-scoped, low risk. Related: FEAT-283/SLICE-201 (the fix this builds on), SLICE-200 (an instance of the unpinned convention). No cost analog checked this pass."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Pin artifact-timestamp convention and add deterministic tie-break sort key
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given two review artifacts for the same slice both use a date-only filename shape (hyphenated YYYY-MM-DD- or compact YYYYMMDD-), When parseFilenameTimestamp resolves their sort keys, Then a deterministic secondary sort key (mtime, then lexical filename) breaks the tie instead of falling through to fs.readdir() order in review-gate.mts:84.", "AC-2: Given one artifact is date-only (parses to UTC midnight) and a same-day artifact carries a full compact-ISO timestamp with time-of-day, When both are sorted, Then the artifact actually written later sorts first rather than being outranked by the midnight-parsing date-only artifact.", "AC-3: Given skills/workflow/review-gates/SKILL.md's instructions to reviewer/validator agents, When this slice ships, Then the instructions state that newly written artifacts must use the full compact-ISO timestamp with time-of-day, not the date-only shape.", "AC-4: Given a test fixture with two date-only artifacts for one slice on one day, and a second fixture mixing one date-only and one full-ISO artifact for one slice on one day, When the new tests run, Then both resolve to the correct non-readdir-dependent ordering."]
    touches_files: [src/scripts/lib/artifact-verdict.mts, src/scripts/lib/review-gate.mts, skills/workflow/review-gates/SKILL.md, src/tests/artifact-verdict-filename-sort.test.mts]
p0_bucket: carry
p0_bucket_reason: "review-artifact filename tie-break nondeterminism is a live gate-ordering correctness bug, unaffected by the merge"
---
## Description

Review-artifact filename convention is unpinned, so gate ordering can still fall through to fs.readdir order.

SLICE-201 replaced mtime sorting with filename-ISO-timestamp sorting in artifact-verdict.mts, which was the right fix and is verified. A residual nondeterminism remains, found by the SLICE-201 reviewer and confirmed with a corpus check.

Two filename shapes carry no time-of-day: hyphenated YYYY-MM-DD- (9 files) and compact YYYYMMDD- (2 files). Both parse to UTC midnight. When two artifacts for the SAME slice share a date-only filename, their sort keys tie, and the stable-sort tie-break falls through to fs.readdir() order in review-gate.mts:84 — which is not a documented or guaranteed ordering. A gate that decides whether a slice may close should not depend on directory-entry order.

The reviewer characterized the date-only shapes as low-risk legacy. Checked the corpus: that is not accurate. 2026-08-04-review-slice-200.md was written today, by a reviewer agent, in the hyphenated date-only form, while the SLICE-201 reviewer wrote 20260805T010000Z-review-result-slice-201-... in compact ISO. Agents are actively producing both shapes because nothing pins the convention. The eleven date-only files are not a closed historical set.

Two live failure modes follow. (1) Same-day re-review: a slice is reviewed, rejected, fixed and re-reviewed on the same day; if both artifacts are date-only they tie and readdir order silently decides which verdict the gate reads. That is the identical class of defect FEAT-283 item 2 was filed for, with a different nondeterminism source substituted. (2) Mixed-shape same slice: one review lands as 2026-08-04- (midnight) and a later one as 20260804T200000Z-; the earlier-parsing midnight value makes the date-only artifact sort older regardless of which was actually written first, so a superseded verdict can outrank its successor.

No test covers either case — the SLICE-201 tests each compare within a single filename shape, never mixed-shape-same-day.

Acceptance direction. Pin the convention so newly written review and validation artifacts always carry a full compact-ISO timestamp with time-of-day, and make the reviewer/validator instructions state it rather than leaving each agent to choose. Add a deterministic secondary sort key for the residual date-only ties so no ordering ever depends on readdir; mtime then lexical filename is a reasonable pair, and unlike the primary key its imprecision is bounded. Add the missing tests: two date-only artifacts for one slice on one day, and a mixed date-only plus full-ISO pair for one slice on one day. Consider a check that reports any newly created artifact not matching the pinned convention, so drift is visible rather than discovered by a wrong gate verdict.

Related: FEAT-283 and its SLICE-201 (the primary sort fix this builds on), SLICE-200 (whose own review artifact is an instance of the unpinned convention).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Proposed slices (PM decomposition)

- SLICE-1: Pin artifact-timestamp convention and add deterministic tie-break sort key (2 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given two review artifacts for the same slice both use a date-only filename shape (hyphenated YYYY-MM-DD- or compact YYYYMMDD-), When parseFilenameTimestamp resolves their sort keys, Then a deterministic secondary sort key (mtime, then lexical filename) breaks the tie instead of falling through to fs.readdir() order in review-gate.mts:84.
- AC-2: Given one artifact is date-only (parses to UTC midnight) and a same-day artifact carries a full compact-ISO timestamp with time-of-day, When both are sorted, Then the artifact actually written later sorts first rather than being outranked by the midnight-parsing date-only artifact.
- AC-3: Given skills/workflow/review-gates/SKILL.md's instructions to reviewer/validator agents, When this slice ships, Then the instructions state that newly written artifacts must use the full compact-ISO timestamp with time-of-day, not the date-only shape.
- AC-4: Given a test fixture with two date-only artifacts for one slice on one day, and a second fixture mixing one date-only and one full-ISO artifact for one slice on one day, When the new tests run, Then both resolve to the correct non-readdir-dependent ordering.
