---
id: FEAT-034
status: in-progress
priority: P0
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-06
depends_on: []
slices: [SLICE-51]
derived_from: null
pm_customer_impact: 0.75
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.8
pm_technical_risk: 0.5
pm_dependency_depth: 0
pm_composite_priority: P0
pm_autonomous_safe: true
pm_reviewed: 2026-11-05
autonomous_safe: true
triage_notes: "P0: this is a correctness bug in the loop's own safety mechanism — the autonomous_safe/pm_risk_level pre-flight gate that is supposed to prevent exactly the kind of unsafe, high-risk slice this very batch contains (FEAT-031) from being packed without review is dead code today due to a field-name mismatch, independently verified by reading both planner.mts and pm-apply.mts directly. It is also a precondition for wave 2 even starting to order and gate the rest of this batch correctly. technical_risk 0.5 (band 0.3-0.5 top end: the field-name fix itself is low-risk with fallbacks, but the sequential-slice-ordering addition touches feature-lifecycle.mts's shared materialization path used by every future decomposed FEAT, and the regex widening affects touches-files inference repo-wide)."
started_at: 2026-11-06
---
## Description

Wave planner reads PM field names intake never writes — ranking flat, risk pre-flight dead

Source: assumption-attack review #6 (verified live by lead): src/scripts/lib/wave/planner.mts:259-262 reads feature["composite_score"], feature["pm_strategic_fit"], feature["pm_risk_level"]; src/scripts/lib/pm-apply.mts:409-412 writes pm_strategic_alignment, pm_technical_risk, pm_composite_priority (and intake.mts:187). Wave 1 lane F (planner files only; zero overlap with lanes A-E). Depends on: none. Needed before wave 2 so `wave plan` can order and gate the audit FEATs.

Problem: every triaged FEAT scores 0 on compositeScore/strategicFit/pmRiskLevel in the planner, so (a) ranking is flat and (b) the pre-flight at planner.mts:183,209 "autonomous_safe=false AND pm_risk_level >= 0.7" can never drop a slice — FEAT-031 (pm_technical_risk 0.8, autonomous_safe false) would be packed as if safe. Additionally depends_on is honoured only against done/ (planner.mts:214), which is correct, but undocumented in commands/wave.md; and FEAT-level proposed_slices materialize all slices at once (feature-lifecycle.mts:326) with no intra-FEAT ordering, so a FEAT whose slices are meant to run sequentially gets them packed in parallel when their touches_files are disjoint.

Deliverable:
- planner.mts reads the fields pm-apply writes: pm_composite_priority (map P0..P4 to a numeric score, or read composite_score when present as a fallback), pm_strategic_alignment, pm_technical_risk. Keep the legacy names as fallbacks for already-triaged adopter backlogs; log once when only legacy names are present.
- Add `sequential: true` support on FEAT proposed_slices (or a `slice_order` field) so packWave never puts two slices of the same FEAT in one wave when the FEAT declares sequential; default stays parallel.
- commands/wave.md documents: depends_on is checked against done/ only; `wave run` is slash-flow-only (wave/real-deps.mts:3-6 — headless CLI errors at dispatch); widen touches-files inference regex (touches-files.mts:5-6) to crew/, .github/, .claude-plugin/, hooks/, dist/ and root files (package.json, CLAUDE.md, .gitignore).
- Tests: src/tests/wave/planner-pm-fields.test.mts (fixture FEAT with pm_technical_risk 0.8 + autonomous_safe false is dropped by pre-flight; ranking honours pm_composite_priority), src/tests/wave/sequential-slices.test.mts, extend src/tests/wave/touches-files.test.mts for the widened regex.

Acceptance criteria:
- Given a triaged FEAT with pm_technical_risk 0.8 and autonomous_safe false and a pending slice, when wave plan runs, then the slice is dropped with reason "pre-flight: autonomous_safe=false AND pm_risk_level=0.80 >= 0.7".
- Given two FEATs P0 and P2 with pending slices and no conflicts, when wave plan runs, then the P0 slice is listed first.
- Given a FEAT with proposed_slices marked sequential and disjoint touches_files, when wave plan runs, then at most one of its slices appears per wave.
- Given a slice body citing crew/scripts/crew.mts, .github/workflows/ci.yml and package.json, when touches_files inference runs, then all three are inferred.
- bun run test, typecheck, lint green; validate-slice-touches-files green.

Scope: src/scripts/lib/wave/planner.mts, src/scripts/lib/wave/touches-files.mts, src/scripts/lib/slice-linker/feature-lifecycle.mts (sequential flag only), commands/wave.md, src/tests/wave/. No pm-apply changes.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a triaged FEAT with `pm_technical_risk` `0.8` and `autonomous_safe` `false` and a pending slice, When `wave plan` runs, Then the slice is dropped with reason `"pre-flight: autonomous_safe=false AND pm_risk_level=0.80 >= 0.7"`.
- AC-2: Given two FEATs, one `P0` and one `P2`, each with pending slices and no file conflicts, When `wave plan` runs, Then the `P0` slice is listed first.
- AC-3: Given a FEAT with `proposed_slices` marked `sequential` and disjoint `touches_files`, When `wave plan` runs, Then at most one of its slices appears per wave.
- AC-4: Given a slice body citing `crew/scripts/crew.mts`, `.github/workflows/ci.yml`, and `package.json`, When `touches_files` inference runs, Then all three are inferred.
- AC-5: Given the full gate suite, When `bun run test`, `typecheck`, and `lint` run, Then all are green, and `validate-slice-touches-files` is green.
