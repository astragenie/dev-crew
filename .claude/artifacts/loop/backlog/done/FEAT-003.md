---
id: FEAT-003
status: done
completed_at: 2026-08-19
priority: P2
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-19
depends_on: [FEAT-002]
slices: [SLICE-11, SLICE-12, SLICE-13]
derived_from: null
pm_customer_impact: 0.5
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.75
pm_technical_risk: 0.7
pm_dependency_depth: 0.6
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-08-18
autonomous_safe: true
triage_notes: "Directly retires the failure class dev-crew/CLAUDE.md itself names as the reason for the merge; technical_risk banded 0.7 (schema/data-shape change -- devcrew.json schemaVersion 2 -- rollback needs the migrator's .bak, not a plain revert) forces the mandatory pre-mortem; autonomousSafe=false given the fail-hard/fail-soft contract split is exactly the kind of dispatch/state-recovery-adjacent change the loop-discipline skill flags as cascade-risk."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Fail-soft bridge calls to direct imports (4 calls)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Fail-hard write-validation-result direct import
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: devcrew.json schemaVersion 2 merge + migrator
    points: 2
    estimated_tokens: 100000
tags: ["stack:typescript", "area:plugin-config", "concern:seam-elimination"]
needs_contract: true
needs_ux: false
arch_attempt: 0
arch_status: approved
arch_review: approved
started_at: 2026-08-19
slices_complete: [SLICE-13]
---
## Description

P2 Seam elimination: replace crew-bridge.mts execFile layer with direct imports per the section-4 per-call table (write-run-brief, cost-slice, cost-advise fail-soft; mark-badge fail-soft; write-validation-result fail-hard); delete findCrewCli/crewCliRuntime/MIN_CREW_VERSION/CREW_MARKETPLACE_NAME from plugin-identity; delete artifact-as-IPC template writers under the bridge; merge .claude/loop.json + crew config into one .claude/devcrew.json (schemaVersion 2) with in-place migrator. Exit gates: zero execFile-crew hits, zero MIN_CREW_VERSION hits, ceremony e2e-smoke green. Full spec: unification-plan.md section 4 + P2 row.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given crew-bridge.mts's execFile layer is replaced by direct imports, When `grep -rn execFile src/scripts | grep -i crew` runs on the merged tree, Then the match count is 0.
- AC-2: Given findCrewCli/crewCliRuntime/MIN_CREW_VERSION/CREW_MARKETPLACE_NAME are deleted, When `grep -rw MIN_CREW_VERSION src/` runs, Then the match count is 0.
- AC-3: Given the write-validation-result direct-import call fails (e.g. the validation-artifact writer throws), When a phase-gate run hits that failure, Then the phase-gate process exits non-zero and no validation artifact is written as PASS -- this is the fail-hard contract the plan's section 4 table requires, distinguishing it from the fail-soft calls.
- AC-4: Given a fail-soft call (write-run-brief/cost-slice/cost-advise/mark-badge) throws internally, When the direct-import replacement catches it, Then a structured log line naming the failed call site is emitted before continuing -- a silent swallow-and-continue with no log line fails this AC (targets the observability dimension, the lowest-scoring analog dimension available at 0.82).
- AC-5: Given .claude/loop.json + crew config are merged, When the installer's in-place migrator runs against a pre-merge adopter config, Then the output file has schemaVersion: 2 and a .bak of the original is present on disk.

## Proposed slices (PM decomposition)

- SLICE-1: Fail-soft bridge calls to direct imports (4 calls) (2 pts)
- SLICE-2: Fail-hard write-validation-result direct import (2 pts)
- SLICE-3: devcrew.json schemaVersion 2 merge + migrator (2 pts)
