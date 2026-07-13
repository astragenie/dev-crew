---
id: FEAT-241
status: pending
priority: P2
category: enhancement
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: []
slices: []
derived_from: null
tags: [area:loop, area:harness, concern:sdd, concern:spec-truth]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Filed 2026-07-09 from the SDD-frameworks review. Adopts OpenSpec's one genuinely-missing pattern — a maintained specs/-as-source-of-truth capability tree + change-archive loop — into the runner/crew SDD pipeline. Deliberately NOT adopting the OpenSpec tool/CLI (would race crew/runner on workflow-state, per the crew:build-vs-loop conflict class in CLAUDE.md). Steal the pattern, not the harness."
github_issue: 495
github_url: https://github.com/astragenie/runner-plugin/issues/495
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
