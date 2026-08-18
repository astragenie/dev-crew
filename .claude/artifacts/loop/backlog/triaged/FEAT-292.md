---
id: FEAT-292
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.85
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.9
pm_technical_risk: 0.4
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-06
autonomous_safe: false
triage_notes: "Highest-impact item in this batch: measured 2026-08-05, 0 of 28 pending slices carry a touches_files frontmatter key and packWave treats confidence:missing as unpackable, so parallel-worktree wave dispatch — the flagship differentiator per this repo's mission — degrades to solo for essentially every slice. Root cause is structural (agents/pm.md:45 asks the PM to declare paths at triage, before any file is read), not a bug in any one component; readTouchesFiles (wave/touches-files.mts) already has a three-tier confidence model with an inference path, so plumbing exists but is unfed. Three remediation directions are listed in preference order in the FEAT body (record-at-slice-start, infer-from-body, or explicitly accept the gap) with no single obviously-correct pick — that ambiguity plus the blast radius (core differentiator) argues for architect review before dispatch, so autonomous_safe is false pending that call. Pre-mortem (required at P1): most likely two-weeks-later failure is choosing option (a) or (b) and finding real slice bodies don't reliably yield inferable paths either, leaving wave mode still starved; rollback is revert-only (no schema change); the coverage gap here is exactly what SLICE-2 below is meant to make visible going forward. Related: FEAT-288 (parser fix, already landed, corrected premise), FEAT-290 (same producer-gap shape), FEAT-281, FEAT-276 (introduced the writer). No cost analog checked this pass."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Give wave packing a real touches_files data source
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given 0 of 28 pending slices currently carry a declared touches_files value (measured 2026-08-05), When the chosen producer mechanism runs against the current backlog, Then a majority of previously missing-confidence slices resolve to declared or inferred confidence in readTouchesFiles.", "AC-2: Given a slice's real paths are only known once the implementation surface is understood (not at PM triage time), When the slice-start step (start-slice.mts) or the builder records touches_files, Then the value is written to the slice's own frontmatter rather than requested from the PM at triage time.", "AC-3: Given packWave's existing rule that confidence:missing candidates default to solo dispatch, When a slice now resolves to declared or inferred confidence, Then packWave packs it alongside non-conflicting siblings instead of forcing solo dispatch.", "AC-4: Given agents/pm.md:45 currently instructs the PM to guess touches_files only when already known at triage, When this slice ships, Then agents/pm.md is updated to reflect the new producer moment so the guidance no longer describes a field structurally never populated."]
    touches_files: [src/scripts/lib/wave/touches-files.mts, src/scripts/lib/wave/planner.mts, src/scripts/lib/slice-linker/start-slice.mts, agents/pm.md]
  - id_suffix: -SLICE-2
    title: Add touches_files backlog coverage report
    points: 1
    estimated_tokens: 60000
    acceptance_criteria: ["AC-1: Given the current backlog, When the coverage check runs, Then it reports how many slices carry a usable (declared or inferred) touches_files value out of the total.", "AC-2: Given SLICE-1's producer fix ships, When the coverage check is run before and after, Then the reported count visibly increases from the measured 2026-08-05 baseline of 0/28.", "AC-3: Given the coverage count regresses toward zero in the future, When the check runs in CI, Then it surfaces the regression rather than passing silently."]
    touches_files: [src/scripts/validate-slice-touches-files.mts, CLAUDE.md]
p0_bucket: carry
p0_bucket_reason: "wave-mode touches_files producer gap is the flagship parallel-dispatch differentiator; high-value fix, fully portable"
---
## Description

Wave-mode conflict packing has no data source: touches_files is never produced, so parallel dispatch degrades to solo for every slice.

Measured 2026-08-05: 0 of 28 pending slices carry a touches_files frontmatter key, and 0 FEATs declare touches_files inside a proposed_slices entry. SLICE-187 (completed) is the only file in the repo that has one. packWave treats confidence: missing as unpackable and defers such candidates to solo dispatch, so wave mode has never had conflict data for essentially any slice.

This is a producer gap, not a parser gap. FEAT-288 fixed a real defect where the reader could not parse the writer's inline-array output, but that fix is preventive: it changes no on-disk slice today because no slice declares the field in the first place. The two were conflated during FEAT-288's triage; see the correction appended to FEAT-288.

Root cause is agents/pm.md:45, which documents proposedSlices[].touches_files as schema-optional and conservative-only: set it ONLY when you already know, from files you actually read this session, the specific repo-relative path(s) that slice will touch. Never guess a plausible-sounding path from the title alone. When unsure, omit the field entirely; it is never required.

That guidance is individually correct — a wrong path is worse than none, because the wave planner uses it to detect or miss real file conflicts between parallel slices, and a fabricated path produces a fabricated conflict verdict. But the aggregate effect is that the field is omitted every time, so the capability it feeds has never functioned. The PM is being asked to declare implementation paths at triage time, before any file has been read for most FEATs, which is structurally the wrong moment to know them.

Defect class: same producer/consumer shape as FEAT-290 (per-slice acceptance_criteria implemented on the consumer side, never populated by the producer) and FEAT-281 (tested-but-never-wired). The consumer is built and tested; nothing feeds it.

Acceptance direction, in preference order. (a) Move the declaration to a moment when the paths are actually known: have the builder or the slice-start step record touches_files after the implementation surface is understood, rather than asking the PM to predict it at triage. A slice that has already been planned knows its files. (b) Alternatively, derive touches_files from the slice body's In scope section, which by convention already names concrete paths, and treat that as an inferred rather than declared confidence tier — note readTouchesFiles already has an inference path and a three-tier confidence model, so the plumbing exists. (c) If neither is viable, accept that wave packing cannot use declared paths and make that explicit, rather than leaving a documented field that is never populated and a planner that silently degrades.

Whichever path is chosen, add a check that reports how many slices in the current backlog carry a usable touches_files value, so this cannot silently return to zero unnoticed.

Related: FEAT-288 (the parser fix and its corrected scoring premise), FEAT-290 (same producer-gap shape), FEAT-281 (defect class), FEAT-276 (which introduced the writer).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Proposed slices (PM decomposition)

- SLICE-1: Give wave packing a real touches_files data source (2 pts)
- SLICE-2: Add touches_files backlog coverage report (1 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given 0 of 28 pending slices currently carry a declared touches_files value (measured 2026-08-05), When the chosen producer mechanism runs against the current backlog, Then a majority of previously missing-confidence slices resolve to declared or inferred confidence in readTouchesFiles.
- AC-2: Given a slice's real paths are only known once the implementation surface is understood (not at PM triage time), When the slice-start step (start-slice.mts) or the builder records touches_files, Then the value is written to the slice's own frontmatter rather than requested from the PM at triage time.
- AC-3: Given packWave's existing rule that confidence:missing candidates default to solo dispatch, When a slice now resolves to declared or inferred confidence, Then packWave packs it alongside non-conflicting siblings instead of forcing solo dispatch.
- AC-4: Given agents/pm.md:45 currently instructs the PM to guess touches_files only when already known at triage, When this slice ships, Then agents/pm.md is updated to reflect the new producer moment so the guidance no longer describes a field structurally never populated.
- AC-5: Given the current backlog, When the coverage check runs, Then it reports how many slices carry a usable (declared or inferred) touches_files value out of the total.
- AC-6: Given SLICE-1's producer fix ships, When the coverage check is run before and after, Then the reported count visibly increases from the measured 2026-08-05 baseline of 0/28.
- AC-7: Given the coverage count regresses toward zero in the future, When the check runs in CI, Then it surfaces the regression rather than passing silently.
