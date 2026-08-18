---
id: FEAT-233
status: triaged
priority: P2
category: architecture
target_release: null
created: 2026-07-08
updated: 2026-08-02
depends_on: [FEAT-188]
slices: []
derived_from: null
tags: ["concern:memory", "concern:reliability", "surface:plugin", "stack:typescript", cross-plugin]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: 2026-08-02
triage_notes: "P2: real but non-urgent reliability debt (a short-lived CLI process's event loop held open up to ~5s post-return) with the risky, contract-changing half of the work explicitly deferred to an unshipped upstream dependency; technical_risk banded at 0.3-0.5 (new pattern, no schema change, clean rollback) for the realistically-scoped local-seam-and-cap-policy work."
github_issue: 492
github_url: "https://github.com/astragenie/runner-plugin/issues/492"
pm_customer_impact: 0.45
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.45
pm_technical_risk: 0.4
pm_dependency_depth: 0.5
pm_composite_priority: P2
pm_autonomous_safe: false
proposed_slices:
  - id_suffix: -SLICE-1
    title: Local AbortSignal-ready seam in memory-transport.mts
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Reconcile capture/recall cap policy + DEC
    points: 1
    estimated_tokens: 60000
p0_bucket: carry
p0_bucket_reason: "runner<->astramem-client seam (not crew<->runner); memory-transport event-loop fix and cap-policy DEC survive the merge unchanged"
---
# FEAT-233: memory transport reliability — AbortSignal cancellation + reconcile cap policy

## Problem

Two reliability gaps in the memory transport, both surfaced by the v0.64.0
architect design review:

1. **No cancellation (astramem-plugin#29).** `sendViaProvider`
   (`memory-transport.mts`) races the provider call against a wallclock cap, but
   the LOSING call is *abandoned, not cancelled*. astramem-plugin's providers
   carry internal 5s abort timers that are neither unref'd nor driven by an
   `AbortSignal`, so a slow-but-reachable backend can hold a short-lived CLI
   process's event loop open up to ~5s after the function has already returned.
   The `MemoryProvider` contract never specified `AbortSignal` support — the root
   cause, externalized as upstream `astramem-plugin#29`.
2. **Cap-policy asymmetry.** Capture caps at a hardcoded `CAP_MS = 2000`
   (`memory-transport.mts`); recall caps at `memory.recall.timeoutMs` default 5000
   (`start-slice.mts`). The asymmetry was never reconciled as a deliberate policy —
   it is incidental to how each path was built.

## Goal

Close the cancellation gap end-to-end (drive the upstream `AbortSignal` support,
then consume it so capped calls are truly cancelled) and reconcile the
capture/recall cap into one documented policy.

## Acceptance criteria

- AC-1: GIVEN astramem-plugin exposes `AbortSignal` support (upstream #29), WHEN
  `sendViaProvider`/recall cap a call, THEN they pass an `AbortSignal` that
  actually cancels the losing call — no process-liveness hold after return
  (assert the KNOWN LIMIT note on `sendViaProvider` can be removed).
- AC-2 (edge — upstream not yet shipped): GIVEN astramem-plugin#29 is NOT yet
  released, WHEN this FEAT is picked, THEN the local side lands a clean seam ready
  for the signal + an updated upstream-request under `docs/upstream-requests/`, and
  does NOT reimplement the retired in-process HTTP client (dev-team#172).
- AC-3: GIVEN capture and recall caps, WHEN reconciled, THEN a single documented
  policy governs both (either a shared default + explicit per-path override with a
  rationale, or one value) — captured in a DEC-* and in `docs/halt-badges.md`/
  code comments, not left incidental.
- AC-4: Full suite green; typecheck + lint + format clean.

## Risks / open questions

- Upstream dependency: AC-1 is blocked on astramem-plugin#29. This FEAT may split
  into a local-seam slice (unblocked) + an upstream-consumption slice (blocked).
- Do NOT "fix" the timer by reimplementing the HTTP client — retired per
  dev-team#172; the only sanctioned fix is upstream signal/unref support.

## Refs

- Architect review: `.claude/artifacts/crew/reviews/20260708T081707Z-...design...md`.
- `src/scripts/lib/memory-transport.mts` (`sendViaProvider`, `CAP_MS`, KNOWN LIMIT note).
- `src/scripts/lib/slice-linker/start-slice.mts` (recall `timeoutMs` cap).
- Upstream: `astramem-plugin#29` (AbortSignal / unref'd timers).
- `docs/contracts/recall-injection-v1.md` + FEAT-188 (dev-team).

## Proposed slices (PM decomposition)

- SLICE-1: Local AbortSignal-ready seam in memory-transport.mts (2 pts)
- SLICE-2: Reconcile capture/recall cap policy + DEC (1 pts)
