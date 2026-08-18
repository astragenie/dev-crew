---
id: FEAT-297
status: done
priority: P1
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: [SLICE-206]
derived_from: null
pm_customer_impact: 0.8
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.6
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-06
autonomous_safe: true
triage_notes: "Live, active blocker on in-flight FEAT-230: extractAcceptanceCriteriaDetailed (backlog-store/slice-store.mts) captures only the first physical line of each markdown AC bullet, and FEAT-230 wrapped its ACs across multiple lines (normal markdown), so SLICE-196 through SLICE-199 all carry ACs that end mid-clause with no Then clause — a builder handed these has nothing to build against or verify at close. Silent by construction (a truncated AC is still a well-formed checkbox item), and this same extractor also backs assertAcceptanceCriteria's presence gate, so the risk generalizes to any FEAT whose ACs wrap. High customer_impact because it directly blocks 4 already-scoped, in-flight slices right now, not a latent risk. Fix is a contained parsing change (accumulate continuation lines) plus a byte-for-byte fixture test and backfilling SLICE-197/198/199 (SLICE-196 already hand-corrected) — moderate effort, low-to-moderate risk, single module. Related: FEAT-290 (per-slice ACs never produced, the other half of why slices carry wrong ACs), FEAT-230 (the affected slices). No cost analog checked this pass."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Fix AC extractor line-truncation and backfill SLICE-197/198/199
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given extractAcceptanceCriteriaDetailed in slice-store.mts currently captures only the first physical line of each markdown bullet, When a FEAT's AC bullet wraps across multiple lines (the normal markdown shape), Then the extractor accumulates continuation lines until the next bullet, a blank line followed by a non-indented line, or the next heading.", "AC-2: Given a test fixture FEAT with deliberately wrapped ACs, When the extractor runs against it, Then the extracted text matches the source AC text in full, byte for byte, not truncated mid-clause.", "AC-3: Given assertAcceptanceCriteria (slice-store.mts:294) relies on the same extraction to decide whether a FEAT has real ACs at all, When this fix ships, Then a regression test confirms a FEAT whose ACs all wrap no longer risks passing the presence check while delivering fragments.", "AC-4: Given SLICE_197, SLICE_198, and SLICE_199 (SLICE_196 already hand-corrected) currently carry the truncated first-line-only ACs from FEAT-230, When this slice ships, Then all three are backfilled or regenerated with their complete acceptance criteria from FEAT-230."]
    touches_files: [src/scripts/lib/backlog-store/slice-store.mts, src/tests/extract-acceptance-criteria.test.mts, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_197_RESOLVE-SKILLS-CLI-SLICE-TAGS-INTEGRATION-PICKBLOCK-FALLBACK.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_198_CROSS-PLUGIN-DOCS-UPSTREAM-REQUEST-AMENDMENT.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_199_CI-FIXTURE-SNAPSHOT-GATE-DEC-071-WRITE-UP.md]
started_at: 2026-08-06
completed_at: 2026-08-18
slices_complete: [SLICE-206]
github_issue: 629
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/629"
p0_merge_evidence: "0df469ff merge: SLICE-206 (fix AC extractor CRLF/wrapped-bullet truncation) — wave 1"
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
## Proposed slices (PM decomposition)

- SLICE-1: Fix AC extractor line-truncation and backfill SLICE-197/198/199 (2 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given extractAcceptanceCriteriaDetailed in slice-store.mts currently captures only the first physical line of each markdown bullet, When a FEAT's AC bullet wraps across multiple lines (the normal markdown shape), Then the extractor accumulates continuation lines until the next bullet, a blank line followed by a non-indented line, or the next heading.
- AC-2: Given a test fixture FEAT with deliberately wrapped ACs, When the extractor runs against it, Then the extracted text matches the source AC text in full, byte for byte, not truncated mid-clause.
- AC-3: Given assertAcceptanceCriteria (slice-store.mts:294) relies on the same extraction to decide whether a FEAT has real ACs at all, When this fix ships, Then a regression test confirms a FEAT whose ACs all wrap no longer risks passing the presence check while delivering fragments.
- AC-4: Given SLICE_197, SLICE_198, and SLICE_199 (SLICE_196 already hand-corrected) currently carry the truncated first-line-only ACs from FEAT-230, When this slice ships, Then all three are backfilled or regenerated with their complete acceptance criteria from FEAT-230.
