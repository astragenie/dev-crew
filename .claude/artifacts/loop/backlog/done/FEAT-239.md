---
id: FEAT-239
status: done
closed: 2026-07-08
priority: P2
category: bug
target_release: null
created: 2026-07-08
updated: 2026-07-08
depends_on: []
slices: []
derived_from: null
tags: [concern:reliability, area:slice-ceremony, area:grading]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Filed 2026-07-08 from plugins-common loop adoption. Reproduced: `slice close --grade-yaml <valid.yaml>` fails with `Score validation failed: missing dimension: *` for all 7 dimensions even though the yaml is well-formed. Breaks the single-shot autonomous close path; workaround is scaffold + hand-edit markdown + standalone `slice grade-write`."
---
## Description

`slice close --grade-yaml <path>` writes the supplied yaml **verbatim** as the grade file
(no `---` frontmatter delimiters, no markdown body). But the score validator
(`src/scripts/lib/grade-parser.mts::parseScoresFromBody`) reads scores **only** from a
`## Scores` markdown body list of the form `- <dimension>: <0.xx>`.

Result: a valid grade yaml with a proper `scores:` map fails close with:

```
Score validation failed:
  - missing dimension: architecture_quality
  - missing dimension: reliability
  ... (all 7)
```

The slice-complete steps (move slice/feature, write handoff/synthesis) DO run first, so the
slice ends up half-closed: files moved but no grade written and no decisions extracted. The
single-shot autonomous `runner:close --grade-yaml` path is unusable.

**Workaround used in the field:** let close scaffold + fail, then hand-rewrite the grade file
into the template markdown (frontmatter + `## Scores` list + `## Lessons` + `## Decisions`),
then run standalone `slice grade-write --id SLICE-NN`.

## Acceptance criteria
- AC-1: Given a well-formed grade yaml (frontmatter-style `scores:` map with all 7 dimensions), When `slice close --grade-yaml <path>` runs, Then the grade file is rendered into the template markdown (`## Scores` list populated from the map) so `parseScoresFromBody` reads it, and validation passes.
- AC-2 (alternative/also): `parseScoresFromBody` (or its caller) falls back to the frontmatter `scores:` map when the `## Scores` body list is absent, so both input shapes validate.
- AC-3: Given the yaml also carries `lessons:` and `decisions:`, When close renders the grade, Then those become the `## Lessons` bullets and `### DEC-TBD` blocks the decision extractor expects.
- AC-4: A regression test drives `slice close --grade-yaml` end-to-end on a fixture yaml and asserts a non-zero `scoresAverage` + allocated decisions, not a `missing dimension` failure.
