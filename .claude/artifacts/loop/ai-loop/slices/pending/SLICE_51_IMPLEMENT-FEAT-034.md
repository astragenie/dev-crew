---
id: SLICE-51
title: Implement FEAT-034
status: pending
feature: FEAT-034
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
---
# SLICE-51: Implement FEAT-034

Implements FEAT-034. See [feature file](../../../backlog/in-progress/FEAT-034.md) for product context.

## Objective

Wave planner reads PM field names intake never writes — ranking flat, risk pre-flight dead

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given a triaged FEAT with `pm_technical_risk` `0.8` and `autonomous_safe` `false` and a pending slice, When `wave plan` runs, Then the slice is dropped with reason `"pre-flight: autonomous_safe=false AND pm_risk_level=0.80 >= 0.7"`.
- [ ] AC-2: Given two FEATs, one `P0` and one `P2`, each with pending slices and no file conflicts, When `wave plan` runs, Then the `P0` slice is listed first.
- [ ] AC-3: Given a FEAT with `proposed_slices` marked `sequential` and disjoint `touches_files`, When `wave plan` runs, Then at most one of its slices appears per wave.
- [ ] AC-4: Given a slice body citing `crew/scripts/crew.mts`, `.github/workflows/ci.yml`, and `package.json`, When `touches_files` inference runs, Then all three are inferred.
- [ ] AC-5: Given the full gate suite, When `bun run test`, `typecheck`, and `lint` run, Then all are green, and `validate-slice-touches-files` is green.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-034 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
