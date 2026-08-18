---
id: SLICE-206
title: Fix AC extractor line-truncation and backfill SLICE-197/198/199
status: completed
feature: FEAT-297
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-06
updated: 2026-08-18
effort_points: 2
proposed_slice_id_suffix: -SLICE-1
estimated_tokens: 100000
touches_files: [src/scripts/lib/backlog-store/slice-store.mts, src/tests/extract-acceptance-criteria.test.mts, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_197_RESOLVE-SKILLS-CLI-SLICE-TAGS-INTEGRATION-PICKBLOCK-FALLBACK.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_198_CROSS-PLUGIN-DOCS-UPSTREAM-REQUEST-AMENDMENT.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_199_CI-FIXTURE-SNAPSHOT-GATE-DEC-071-WRITE-UP.md]
github_issue: 630
github_url: "https://github.com/astragenie/runner-plugin/issues/630"
---
# SLICE-206: Fix AC extractor line-truncation and backfill SLICE-197/198/199

Implements FEAT-297. See [feature file](../../../backlog/in-progress/FEAT-297.md) for product context.

## Objective

Slice generator truncates multi-line acceptance criteria to their first physical line, producing ACs that end mid-clause.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given extractAcceptanceCriteriaDetailed in slice-store.mts currently captures only the first physical line of each markdown bullet, When a FEAT's AC bullet wraps across multiple lines (the normal markdown shape), Then the extractor accumulates continuation lines until the next bullet, a blank line followed by a non-indented line, or the next heading.
- [ ] AC-2: Given a test fixture FEAT with deliberately wrapped ACs, When the extractor runs against it, Then the extracted text matches the source AC text in full, byte for byte, not truncated mid-clause.
- [ ] AC-3: Given assertAcceptanceCriteria (slice-store.mts:294) relies on the same extraction to decide whether a FEAT has real ACs at all, When this fix ships, Then a regression test confirms a FEAT whose ACs all wrap no longer risks passing the presence check while delivering fragments.
- [ ] AC-4: Given SLICE_197, SLICE_198, and SLICE_199 (SLICE_196 already hand-corrected) currently carry the truncated first-line-only ACs from FEAT-230, When this slice ships, Then all three are backfilled or regenerated with their complete acceptance criteria from FEAT-230.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-297 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
