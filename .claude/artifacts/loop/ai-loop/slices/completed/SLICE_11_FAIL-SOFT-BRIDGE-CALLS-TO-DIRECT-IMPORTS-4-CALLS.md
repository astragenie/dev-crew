---
id: SLICE-11
title: Fail-soft bridge calls to direct imports (4 calls)
status: completed
feature: FEAT-003
phase: null
priority: P2
target_release: null
requires_validation: false
risk: high
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-1
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-11: Fail-soft bridge calls to direct imports (4 calls)

Implements FEAT-003. See [feature file](../../../backlog/in-progress/FEAT-003.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: SLICE-11 = the four fail-soft calls + tsconfig unblock.
> AC-2 (plugin-identity deletions) -> SLICE-13; AC-3 (fail-hard) -> SLICE-12; AC-5 (config) -> SLICE-13.

- [x] AC-A: write-run-brief/cost-slice/cost-advise/mark-badge are direct imports; execFile remains only in phase-gate path (SLICE-12). EVIDENCE: reviewer line-by-line parity check; grep confirms; FEAT-204 cursor semantics verbatim.
- [x] AC-B (was AC-4): every fail-soft catch emits structured [crew-bridge] log naming call site. EVIDENCE: per-call review.
- [x] AC-C: extraction fidelity (cost-advise-writer.mts byte-equivalent, crew.mts consumes it); crew suite 1971/0 proves CLI parity. EVIDENCE: review artifact 20260819T020332Z.
- [x] AC-D: rewritten regression tests are genuine (live guard-flip went red, restore went green). EVIDENCE: reviewer round-trip.
- [x] AC-E: tsconfig rootDir removed both configs; typechecks 0; root suite 3310/2 known.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-003 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
