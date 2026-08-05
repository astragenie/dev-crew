---
id: FEAT-297
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

Slice generator truncates multi-line acceptance criteria to their first physical line, producing ACs that end mid-clause.

Found 2026-08-05 while scoping SLICE-196. FEAT-230's acceptance criteria are written wrapped across several lines each, which is normal markdown. extractAcceptanceCriteriaDetailed, used by slice-store.mts when a proposed_slices entry carries no per-slice acceptance_criteria, captures only the first physical line of each bullet. The generated slice therefore contains fragments:

- AC-1: GIVEN a slice tagged stack:csharp + concern:security, WHEN the
- AC-2: GIVEN a signal that maps to no available skill, WHEN resolving, THEN the
- AC-3: GIVEN a repo with presets present, WHEN the dispatcher resolves skills,
- AC-4: GIVEN the resolver output, WHEN a builder is dispatched, THEN the

Every one ends mid-sentence. The real AC-1 continues THEN it returns only skill IDs that EXIST in the live crew catalog, matched to the task signals — the entire requirement is in the truncated part. A builder handed this slice sees a Given and a dangling When with no Then, so there is nothing to build against and nothing to verify at close.

This is distinct from the copied-sibling-ACs problem filed as FEAT-290, and it did not surface earlier because it depends on how the FEAT author wrapped their text. FEAT-283 and FEAT-284 wrote each AC as one long physical line, so their generated slices carried complete ACs. FEAT-230 wrapped, so its four slices — SLICE-196 through SLICE-199 — all carry truncated ones. The two defects compose badly: the shared-AC fallback copies the wrong ACs, and this then truncates them.

Silent by construction. A truncated AC is still a well-formed markdown checkbox item, so no gate notices, the slice file looks complete, and the loss is only visible by comparing against the source FEAT.

Acceptance direction. Teach the extractor to accumulate continuation lines: a bullet continues until the next bullet, a blank line followed by a non-indented line, or the next heading. Indented continuation lines are the normal markdown shape and are what it currently drops. Add a test whose fixture FEAT has deliberately wrapped ACs and assert the extracted text matches the source in full, byte for byte.

Then check the other consumers of the same extractor rather than assuming this is the only caller — the assertAcceptanceCriteria gate referenced in slice-store.mts:294 relies on the same extraction to decide whether a FEAT has real ACs at all, so a FEAT whose ACs all wrap could in principle pass a presence check while delivering fragments.

Backfill note: SLICE-196 through SLICE-199 already exist with truncated ACs. SLICE-196 has been hand-corrected. The other three need the same treatment or regeneration once this is fixed.

Related: FEAT-290 (per-slice ACs never produced — the other half of why slices carry wrong ACs), FEAT-230 (whose four slices are the affected set).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.