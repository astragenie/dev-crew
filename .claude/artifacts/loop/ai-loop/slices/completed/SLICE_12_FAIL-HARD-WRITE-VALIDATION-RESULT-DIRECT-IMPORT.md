---
id: SLICE-12
title: Fail-hard write-validation-result direct import
status: completed
feature: FEAT-003
phase: null
priority: P2
target_release: null
requires_validation: false
risk: high
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-2
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-12: Fail-hard write-validation-result direct import

Implements FEAT-003. See [feature file](../../../backlog/in-progress/FEAT-003.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: SLICE-12 = write-validation-result direct import + NEW fail-hard contract.

- [x] AC-A (was AC-3): writer failure -> phase-gate rejects, no PASS artifact claimed, both serial + parallel paths. EVIDENCE: new fail-hard test (sabotaged artifacts dir); reviewer independently re-ran the round-trip (pre-slice code 4/5 with fail-hard red; new code 5/5).
- [x] AC-B: extraction fidelity (validation-result-writer.mts equivalent incl. preserved slice-field quirk documented, not silently fixed); crew CLI UX byte-preserved (stderr + exit 2). EVIDENCE: reviewer diff + crew suite 1971/0.
- [x] AC-C: AC-1 fully satisfied — zero live execFile-to-crew in src/scripts (comment hits only). EVIDENCE: reviewer grep.
- [x] AC-D: no premature deletions (plugin-identity zero diff — SLICE-13); narrowing idiom explicit === throughout; suites 3312/2 known + 1971/0; three typechecks clean (IDE exactOptionalPropertyTypes noise = editor cross-config context, CLI truth clean).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-003 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
