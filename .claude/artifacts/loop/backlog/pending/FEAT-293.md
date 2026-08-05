---
id: FEAT-293
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-05
depends_on: []
slices: []
derived_from: null
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