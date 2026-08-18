---
id: FEAT-241
status: triaged
priority: P2
category: enhancement
target_release: null
created: 2026-07-09
updated: 2026-07-19
depends_on: []
slices: []
derived_from: null
tags: [be]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: 2026-07-19
triage_notes: "P2 despite low customer_impact because strategic_alignment is high (this is core SDD-methodology tooling, the product's own mission) and technical_risk lands in the 0.6-0.8 band (cross-module reach: close-ceremony + spec-status + contracts reconciliation; new artifact-system pattern; no schema/DB change but a data-shape reorganization of derived-vs-authored truth) — pre-mortem required and completed above per the >=0.6 technical_risk trigger. effort_estimate 0.75 maps (via the assumed pm-effort-mapper Fibonacci banding: 0.71-0.85 -> 13 points) to effort_points=13, triggering the decomposition gate — decomposed below with landmines (reconciliation algorithm, drift-diff algorithm) isolated into their own slices per runner#393 rule (a), and no >2-point entries per the tightened cap."
github_issue: 495
github_url: "https://github.com/astragenie/runner-plugin/issues/495"
pm_customer_impact: 0.35
pm_effort_estimate: 0.75
pm_strategic_alignment: 0.65
pm_technical_risk: 0.65
pm_dependency_depth: 0.15
pm_composite_priority: P2
pm_autonomous_safe: false
proposed_slices:
  - id_suffix: -SLICE-1
    title: specs/ tree scaffold + one-capability-per-file schema/README
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: "Change-archive reconciliation core algorithm (additive merge, idempotency)"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: Wire reconciliation into slice/FEAT close ceremony
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: spec-status --drift diff mode (authored vs derived)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-5
    title: Idempotency + re-close regression tests (AC-2)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-6
    title: No-clobber concurrent-reconciliation tests (AC-4) + drift tests (AC-3)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-7
    title: specs/ rollout docs + spec-status CLI flag docs
    points: 1
    estimated_tokens: 60000
p0_bucket: defer
p0_bucket_reason: "large new specs/-as-source-of-truth methodology layer; scope/placement unclear until devcrew's own CI/spec conventions (SS7 harmonization) settle"
---
## Description

Our runner/crew loop is already spec-driven: `intake → triage → SPEC bodies → FEAT
Given-When-Then ACs → crew:architect-feature contracts (designs/<FEAT>-contracts.openapi.yaml + .md)
→ slices → pre-slice-1 architect+risk gate → DEC-NNN ADRs`. The one thing every mature SDD
framework (OpenSpec, Spec Kit, Kiro, Tessl) has that we do **not** is a **maintained
`specs/`-as-source-of-truth capability tree**: an authoritative, always-current description of
*what the system does today*, that proposed changes diff against.

Today our "current truth" is **derived, not authored** — `spec-status` reconstructs it from
`done/` FEATs, and MEMORY.md/export-md re-fetch from the daemon. There is no single artifact a
human or the architect gate can read to answer "what does this subsystem currently guarantee?"
without replaying backlog history.

**This FEAT adds:**
1. A maintained **`specs/` capability tree** (e.g. `.claude/specs/<capability>.md`) — the living
   source of truth, one file per capability/subsystem, holding the current contract (interfaces,
   invariants, guarantees) — NOT the change history.
2. A **change-archive step** at slice/FEAT close: when a FEAT completes, its
   architect-feature contract (`designs/<FEAT>-contracts.*`) is reconciled INTO the relevant
   `specs/` file (append/merge the now-shipped capability), so `specs/` stays current without
   manual upkeep. The FEAT/change folder remains the delta record; `specs/` is the accumulated truth.
3. `spec-status` gains a mode that **diffs `specs/` (authored truth) against derived (done-FEAT)
   truth** and flags drift, instead of only deriving.

## Why / where it helps (reasoning)

| Our component | How a maintained `specs/` tree helps |
|---|---|
| **crew:architect-feature** | Architect drafts a contract by diffing against the *current* `specs/` capability, not by re-reading scattered done-FEATs → less rediscovery, fewer contradictory contracts. |
| **pre-slice-1 architect gate** (just shipped) | The gate's reviewer gets a stable baseline ("here's what exists") to judge a design's fit/risk against — sharper `needs_revision` calls, fewer false approvals. |
| **runner:triage / PM** | Scope + dependency scoring improves when "what already exists" is one readable tree instead of reconstructed from history. |
| **recall / MEMORY.md / onboarding** | A committed `specs/` tree is the highest-signal thing to inject at SessionStart / export — authoritative, human-readable, CI-diffable. |
| **spec-status** | Becomes a real drift detector (authored vs derived), catching "we shipped X but the spec never said so" and "the spec claims Y we removed". |

## Non-goals / explicitly rejected
- **Do NOT adopt the OpenSpec CLI/tool itself.** Running a second SDD orchestrator alongside
  runner/crew races on workflow-state — the same failure class CLAUDE.md warns about for
  `crew:build` vs the loop. Steal the pattern into our harness; keep one orchestrator.
- No new wire schema; `specs/` is client-local like the backlog.

## Acceptance criteria (Given-When-Then)
- AC-1: **Given** a repo with the loop installed, **when** `specs/` scaffolding is initialized,
  **then** a documented `.claude/specs/` tree exists with a schema/README defining one-capability-per-file.
- AC-2: **Given** a FEAT reaches slice-close, **when** the close ceremony runs, **then** its
  architect-feature contract is reconciled into the relevant `specs/` file (additive merge; no clobber),
  and the reconciliation is idempotent on re-close.
- AC-3: **Given** authored `specs/` and derived (done-FEAT) truth, **when** `spec-status --drift`
  runs, **then** it reports capabilities present in one but not the other.
- AC-4: **Given** the change-archive step, **when** it runs, **then** it never overwrites unrelated
  `specs/` sections (reuse the cross-producer clobber-guard pattern from the contracts artifact, DEC/SPIKE-1).

## Cross-repo note
Complements the arch-gate epic (this branch): the gate enforces "align on design before code";
this FEAT gives that alignment a durable place to accumulate. Contract-artifact reconciliation
should reuse the `.openapi.yaml`-keyed idempotency + `.md`-clobber guards already built for
`designs/<FEAT>-contracts.*`.

## Proposed slices (PM decomposition)

- SLICE-1: specs/ tree scaffold + one-capability-per-file schema/README (2 pts)
- SLICE-2: Change-archive reconciliation core algorithm (additive merge, idempotency) (2 pts)
- SLICE-3: Wire reconciliation into slice/FEAT close ceremony (2 pts)
- SLICE-4: spec-status --drift diff mode (authored vs derived) (2 pts)
- SLICE-5: Idempotency + re-close regression tests (AC-2) (2 pts)
- SLICE-6: No-clobber concurrent-reconciliation tests (AC-4) + drift tests (AC-3) (2 pts)
- SLICE-7: specs/ rollout docs + spec-status CLI flag docs (1 pts)
