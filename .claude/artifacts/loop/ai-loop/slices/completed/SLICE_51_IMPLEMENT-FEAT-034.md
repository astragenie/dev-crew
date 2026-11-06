---
id: SLICE-51
title: Implement FEAT-034
status: completed
feature: FEAT-034
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
completed_at: 2026-11-06
badges: [serial-reviewer-warning]
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

- [x] AC-1: Given a triaged FEAT with `pm_technical_risk` `0.8` and `autonomous_safe` `false` and a pending slice, When `wave plan` runs, Then the slice is dropped with reason `"pre-flight: autonomous_safe=false AND pm_risk_level=0.80 >= 0.7"`. Evidence: `src/scripts/lib/wave/planner.mts` now reads `pm_technical_risk` (fallback `pm_risk_level`) via `resolvePmNumeric`; `src/tests/wave/planner-pm-fields.test.mts::"AC-1: pm_technical_risk 0.8 + autonomous_safe false is dropped with the exact pre-flight reason"` asserts the exact string. `bun test src/tests/wave/` rc=0 (145 pass).
- [x] AC-2: Given two FEATs, one `P0` and one `P2`, each with pending slices and no file conflicts, When `wave plan` runs, Then the `P0` slice is listed first. Evidence: `resolveCompositeScore` maps `pm_composite_priority` P0→1.0/P2→0.5; `planner-pm-fields.test.mts::"AC-2: pm_composite_priority P0 ranks ahead of P2"` packs both and asserts `["SLICE-P0","SLICE-P2"]` order.
- [x] AC-3: Given a FEAT with `proposed_slices` marked `sequential` and disjoint `touches_files`, When `wave plan` runs, Then at most one of its slices appears per wave. Evidence: `packWave` tracks `pickedSequentialGroups`; `feature-lifecycle.mts` stamps `sequential_group: <FEAT id>` on each sibling when the FEAT declares `sequential: true`; `src/tests/wave/sequential-slices.test.mts` (packWave-level + loadCandidates + real `sliceFromFeature` materialization) all green.
- [x] AC-4: Given a slice body citing `crew/scripts/crew.mts`, `.github/workflows/ci.yml`, and `package.json`, When `touches_files` inference runs, Then all three are inferred. Evidence: `touches-files.mts`'s `INFERENCE_RE` widened; `src/tests/wave/touches-files.test.mts::"AC-4: infers crew/, .github/, and a bare root file (package.json) from the body"` passes.
- [x] AC-5: Given the full gate suite, When `bun run test`, `typecheck`, and `lint` run, Then all are green, and `validate-slice-touches-files` is green. Evidence: `bun run typecheck` rc=0, `bun run lint` rc=0 (pre-existing repo-wide warnings only, no new error-level diagnostics), `bun run test` rc=0 (3466 pass/7 skip/0 fail), `bun src/scripts/validate-slice-touches-files.mts` rc=0, `bun src/scripts/validate-imports.mts` rc=0, `bun src/scripts/validate-agent-refs.mts` rc=0, `bun src/scripts/loop.mts wave plan --repo "$PWD" --json` rc=0. Lead amendment (review A): packWave complexity rose to 19 in the lane; extracted `classifyCandidate` + `resolveMissingQueue` in a32f4f76 — packWave no longer flagged; remaining `parseFrontmatterPlanner` warning is pre-existing.

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
