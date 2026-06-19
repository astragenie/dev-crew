---
title: M7 Handler Cutover — Backward-Compat Audit
date: 2026-06-19
status: draft
scope: runner repo (md→jsonl handler flip)
---

# M7 Handler Cutover — Backward-Compat Audit

## Why

Operator decision 2026-06-19: ship M7 cutover **without** full M6 drift-signal validation. SurfaceDiffers are shape-mismatched (count/presence parity, not content equivalence per [[drift-root-cause-shape-mismatch]]). Waiting for the 14-day zero-drift gate is theater. Instead, tier each handler by backward-compat risk and flip in order from safest to riskiest with explicit rollback per tier.

## Current state (as of 2026-06-19)

`AppSettingsController` comments declare `UseJsonlForReads` decommissioned (always-on). Reality is partial: some handlers already read JSONL repos, some still read md only, several are hybrid.

Tally by handler (count of md-only-repo vs jsonl-mirror-repo references):

| Handler | Md refs | JSONL refs | State |
|---|---:|---:|---|
| GradeDimensions | 0 | 1 | **DONE — pure JSONL** |
| GradeDerivation | 0 | 1 | **DONE — pure JSONL** |
| BacklogFlow | 0 | 1 | **DONE — pure JSONL** |
| GetSliceWorkflow | 1 | 2 | hybrid (jsonl-primary) |
| GetSliceAgentRuns | 1 | 1 | hybrid |
| GetSliceDetail | 1 | 1 | hybrid |
| GetRepoOverview | 1 | 1 | hybrid |
| GetAppStats | 1 | 1 | hybrid |
| ListSlices | 4 | 3 | hybrid (md-heavy) |
| CrewInsights | 4 | 1 | hybrid (md-heavy) |
| AgentsBreakdown | 5 | 0 | **TODO — pure md** |
| ListDiscrepancies | 2 | 0 | **TODO — pure md** |
| ListAdvisorFlags | 1 | 0 | **TODO — pure md** |
| ListRepos | 1 | 0 | **TODO — pure md** |
| CrewArtifacts | 0 | 0 | n/a — filesystem reader |
| LoopArtifacts | 0 | 0 | n/a — filesystem reader |

## Risk tiers

### Tier 1 — Safe to declare done (3 handlers, 0 work)

Already pure JSONL with no md fallback. Flip risk = zero, just remove the AppSettings flag plumbing entirely.

- `GradeDimensions` — reads `IGradeRecordRepository`. M3 jsonl mirror covers all grades emitted by loop plugin. Backwards-compat OK: any pre-FEAT-209 grades that were only in `CrewArtifact Grade` artifacts are NOT visible now, but that data is also stale (last md-grade write predates the M3 mirror commit).
- `GradeDerivation` — same pattern.
- `BacklogFlow` — reads `IBacklogFlowRepository` (M5). Md side never existed (md walks git log, not crew artifacts). Flip already happened structurally because M5 added the table.

**Action: none.** Mark these handlers as "M7-complete" in CHANGELOG.

### Tier 2 — Hybrid, safe to flip remainder (5 handlers, ~1-2 days)

Already read JSONL as primary, md as fallback or supplementary. Flipping = drop the md fallback path. Risk: low — JSONL path is exercised in production today (these handlers serve dashboard reads).

- `GetSliceWorkflow` — jsonl-primary (2 jsonl repos, 1 md repo). Md path is the legacy `CrewArtifact` workflow trail. Drop md branch.
- `GetSliceAgentRuns` — hybrid. Md is `CrewArtifact Handoff/FinalSynthesis` count. Jsonl is `AgentRuns`. Drop md.
- `GetSliceDetail` — comment says "MD slug lookup — pending route migration to string SliceId." Md is used only for slug→guid lookup. Replace with direct jsonl lookup by sliceId string.
- `GetRepoOverview` — both paths for summary stats. Drop md, rely on jsonl aggregates.
- `GetAppStats` — same pattern.

**Action: per-handler PR, single-commit each. Smoke test by hitting endpoint on dev env after flip. Rollback = git revert.**

### Tier 3 — Hybrid md-heavy (2 handlers, ~3-5 days, needs verification)

JSONL coverage exists but md is the dominant source. Flipping risks losing data that hasn't been mirrored.

- `ListSlices` — 4 md repo refs vs 3 jsonl. Md likely covers slice metadata (name, description, owner, dependencies) that jsonl mirror doesn't capture. **Verify M1 SliceWorkflowEvent has all needed fields before flip.** If gaps, file FEATs for missing emission first.
- `CrewInsights` — 4 md refs vs 1 jsonl. Md path reads multiple CrewArtifact kinds for aggregated insights. **Audit what jsonl-side equivalents exist** before flipping.

**Action: read each handler end-to-end, list missing jsonl fields, file emission FEATs on loop side if gaps. Defer flip until parity.**

### Tier 4 — Pure md, NOT yet flippable (4 handlers, ~1-2 weeks)

No jsonl path exists. Cutover requires building the jsonl side first.

- `AgentsBreakdown` — 5 md refs. Aggregates agent activity per slice from CrewArtifact. JSONL covers agent dispatches (M3 `AgentRuns`) but breakdown shape may differ. Need new query against `AgentRuns` + acceptance test.
- `ListDiscrepancies` — 2 md refs. Reads `CrewDiscrepancy` table populated by md-path scanner. Jsonl never emits discrepancies (they're a derived comparison output). **Not a cutover candidate — keep md-only.** Document as "Tier 4 — permanent md surface."
- `ListAdvisorFlags` — 1 md ref. Same shape as discrepancies — derived output from md scan. **Same verdict: keep md.**
- `ListRepos` — 1 md ref. Reads `ObservedApplication` (which is md-adjacent but actually a domain entity, not artifact-derived). Likely safe but needs verification — what's the md ref doing?

**Action: split into "safe to flip after building jsonl side" vs "permanent md surface." Document permanent md surfaces in the M7 plan as out-of-scope for cutover.**

### Tier 5 — Filesystem readers, not in cutover scope (2 handlers, 0 work)

- `CrewArtifacts` — reads CrewArtifact rows directly for raw display. No jsonl equivalent and none needed (this is "show me the raw md").
- `LoopArtifacts` — reads filesystem under `.claude/artifacts/loop/` for raw display. Already jsonl-adjacent.

**Action: none. Out of cutover scope by design.**

## Recommended order

1. **Now (no code change)**: declare Tier 1 done. Update CHANGELOG. Remove AppSettings flag plumbing if not already.
2. **Wave A (1-2 days)**: flip Tier 2 — drop md fallback in 5 hybrid handlers. Per-handler commits + dev smoke. PR titles: `refactor(monitor): drop md fallback in <Handler> — M7 cutover Tier 2`.
3. **Wave B (3-5 days)**: audit Tier 3 hybrid md-heavy. File emission FEATs on loop side if gaps. Flip after parity. Slower because needs cross-repo coordination.
4. **Wave C (1-2 weeks)**: build jsonl side for Tier 4 cutover candidates. Defer permanent-md handlers indefinitely.
5. **Document permanent md surfaces** in `docs/superpowers/specs/2026-06-19-m7-handler-cutover-audit.md` (this doc). Operators understand md path persists for discrepancies + advisor flags.

## What we explicitly skip

- **M6 drift signal as cutover gate.** Differ shapes are mismatched (see [[m6-diff-impls-naive]]); zero-drift streak doesn't reflect content equivalence anyway. Replace with smoke test per Wave + 24h dev canary before flipping each Tier 2 handler in prod.
- **FEAT-220/221/222/223/224** (drift strengthening) — defer indefinitely. Differs continue to fire as "ingest health check" not "cutover gate." May ship later if drift visibility matters for ops monitoring.
- **Full presence-parity tightening across all surfaces.** Tier 2 flip is the cheap win; chasing all 5 surfaces to content-equivalence is not.

## Risk acknowledgements

- **Silent content drift on hybrid flips** — if md and jsonl have different content for the same slice, dashboard reads will change behavior. Per-handler smoke + 24h dev canary catches most. Production rollback per handler via git revert (deploy ~5min).
- **Tier 3 + 4 may surface emission gaps on loop side** that we don't know about today. Plan to file cross-repo FEATs as discovered.
- **`CrewDiscrepancies` and `AdvisorFlags` permanently md** — accept this; rename them in the dashboard as "v1 surface" or "legacy" if it matters for UX clarity.
