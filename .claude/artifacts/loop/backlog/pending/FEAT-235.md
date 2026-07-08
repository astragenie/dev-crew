---
id: FEAT-235
status: pending
priority: P2
category: architecture
target_release: null
created: 2026-07-08
updated: 2026-07-08
depends_on: [FEAT-231]
slices: []
derived_from: null
tags: [concern:memory, surface:plugin, stack:typescript, cross-plugin]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Full astramem-client adoption + memory-bridge/memory-recall retirement — the residual of GH #363 and step #3 of the #365 cross-repo consolidation plan. v0.64.0/v0.65.0 migrated CAPTURE (memory-transport→sendViaProvider) and SLICE-START recall (start-slice::runRecallHook→recallSilent) onto @astragenie/astramem-client, but the CLI-spawn pair memory-bridge.mts (resolveCli + spawn fallback in emit) and memory-recall.mts (recallPrior) are still live and consumed by ~8 files (grade-writer, phase-gate ×2, memory-doctor, and — via memory-context.buildMemoryContext — post-builder-fanout + wave/dispatch-prompt + wave/real-deps). FEAT-231 converges the reviewer/wave recall READ path onto recallSilent; THIS FEAT finishes the job: migrate every remaining consumer, resolve the two-vocabulary --type split (DEC: closed MemoryKind enum wins), and delete memory-bridge.mts + memory-recall.mts. Cross-plugin (npm astramem-client) + broad blast radius -> needs_contract, NOT autonomous_safe."
---
# FEAT-235: retire memory-bridge/memory-recall CLI-spawn transport (finish astramem-client adoption)

## Problem

The astramem transport unification (FEAT-188, v0.64.0/v0.65.0) migrated the
capture path and slice-start recall onto the shared
`@astragenie/astramem-client`, but did NOT finish the job. Two CLI-spawn
modules survive and are still on live dispatch surfaces:

- `src/scripts/lib/memory-bridge.mts` — `resolveCli()` + a `spawn(cli.path, …)`
  fallback inside `emit()`; still imported by `grade-writer.mts`,
  `phase-gate.mts`, `phase-gate/parallel-orchestrator.mts`, `memory-doctor.mts`,
  `start-slice.mts`.
- `src/scripts/lib/memory-recall.mts` — `recallPrior()` (CLI-spawn), the ONLY
  recall path for `memory-context.mts::buildMemoryContext`, consumed by
  `post-builder-fanout.mts` (reviewer dispatch) and `wave/dispatch-prompt.mts` /
  `wave/real-deps.mts` (wave recall).

This is GH #363's open residual and step #3 of the #365 consolidation plan
(finding B2: "three astramem transports coexist, none of them astramem-client").
FEAT-231 converges the reviewer/wave READ path onto `recallSilent`; this FEAT
finishes the WRITE path + deletes the dead modules.

## Goal

Every astramem capture/recall call in the repo goes through
`@astragenie/astramem-client` (`rememberSilent` / `recallSilent`). Delete
`memory-bridge.mts` + `memory-recall.mts`. No `resolveCli()` / `spawn` astramem
path anywhere.

## Scope / sequence

1. **(prereq) FEAT-231** — reviewer/wave recall onto `recallSilent` (removes the
   last `recallPrior`/`memory-recall.mts` consumer).
2. Migrate `emit()`'s remaining CLI-spawn fallback + its ~5 callers
   (grade-writer, phase-gate ×2, memory-doctor, start-slice) onto the
   client's capture surface.
3. **DEC**: resolve the two-vocabulary `--type` split (`memory-bridge.mts:17-32`)
   — closed `MemoryKind` enum wins (per #365 decision Q4).
4. Delete `memory-bridge.mts` + `memory-recall.mts`; update `memory-doctor` to
   probe via the client.
5. Grep-proof gate: zero `resolveCli`/`spawn`-for-astramem references remain.

## Acceptance criteria

- AC-1: GIVEN any capture (`emit`/grade/phase-gate/slice-event) or recall
  (reviewer/wave/slice-start) path, WHEN it sends, THEN it calls
  `@astragenie/astramem-client` — grep for `memory-bridge`/`memory-recall`
  imports returns zero (outside their own deleted files + tests).
- AC-2: GIVEN the two modules are deleted, WHEN the suite + tsc run, THEN green
  with no dangling import; `memory-doctor` still reports transport health via
  the client.
- AC-3: A DEC-* records the `--type`/`MemoryKind` vocabulary resolution.
- AC-4 (fail-open preserved): every migrated path stays never-throws /
  byte-identical-when-off.
- AC-5: Full suite green; tsc + lint + format clean; snapshot-freshness passes.

## Risks

- Broad blast radius (~8 consumers) — sequence behind FEAT-231; land in a
  worktree with a golden byte-identity check per migrated site.
- Coordinate with the astramem-client landing chain (#365) — pin the client
  version that exposes the capture surface `emit` needs.

## Refs

- GH #363 (residual), #365 step #3 + finding B2, #359 (closed — capture+slice-start done).
- FEAT-231 (prereq — reviewer/wave recall convergence).
- Verifier report: issue-triage 2026-07-08 (this session).
- `memory-bridge.mts`, `memory-recall.mts`, `memory-context.mts`.
