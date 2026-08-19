---
id: SLICE-12
title: Fail-hard write-validation-result direct import
status: pending
feature: FEAT-003
phase: null
priority: P2
target_release: null
requires_validation: true
risk: high
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-2
estimated_tokens: 100000
tags: ["stack:typescript"]
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

> WARNING: ACs copied from FEAT-003 and shared across 3 sibling slices — scope per-slice before close

- [ ] AC-1: Given crew-bridge.mts's execFile layer is replaced by direct imports, When `grep -rn execFile src/scripts | grep -i crew` runs on the merged tree, Then the match count is 0.
- [ ] AC-2: Given findCrewCli/crewCliRuntime/MIN_CREW_VERSION/CREW_MARKETPLACE_NAME are deleted, When `grep -rw MIN_CREW_VERSION src/` runs, Then the match count is 0.
- [ ] AC-3: Given the write-validation-result direct-import call fails (e.g. the validation-artifact writer throws), When a phase-gate run hits that failure, Then the phase-gate process exits non-zero and no validation artifact is written as PASS -- this is the fail-hard contract the plan's section 4 table requires, distinguishing it from the fail-soft calls.
- [ ] AC-4: Given a fail-soft call (write-run-brief/cost-slice/cost-advise/mark-badge) throws internally, When the direct-import replacement catches it, Then a structured log line naming the failed call site is emitted before continuing -- a silent swallow-and-continue with no log line fails this AC (targets the observability dimension, the lowest-scoring analog dimension available at 0.82).
- [ ] AC-5: Given .claude/loop.json + crew config are merged, When the installer's in-place migrator runs against a pre-merge adopter config, Then the output file has schemaVersion: 2 and a .bak of the original is present on disk.

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
