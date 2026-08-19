---
id: SLICE-19
title: "Greenfield spikes + full /devcrew:* ceremony smoke test"
status: completed
feature: FEAT-004
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
effort_points: 1
proposed_slice_id_suffix: -SLICE-6
estimated_tokens: 60000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-19: Greenfield spikes + full /devcrew:* ceremony smoke test

Implements FEAT-004. See [feature file](../../../backlog/in-progress/FEAT-004.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: validation slice — requires_validation satisfied by its own PASS artifact.

- [x] AC-A: Full ceremony chain green from the merged tree (install/intake/start/close/status/doctor on fixture; dispatchInstruction speaks devcrew:; P2 direct-import seam exercised live). EVIDENCE: validation artifacts 20260819T064902Z (fail, defects) + 20260819T070550Z (pass, superseding).
- [x] AC-B: Smoke-found defects fixed and re-verified: 42 stale crew.ts invocation paths (6 command first-steps execute verbatim, 6/6), /loop: namespace class cleared incl. 2 test regexes + 4 adjacent files; suites re-confirmed by lead (root 3316/2 known, crew 1980/0 parallel).
- [x] AC-C: Blank-page audit of all 39 commands delivered (KEEP 31 / MERGE 7 / CUT 1) — P4 backlog input.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-004 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
