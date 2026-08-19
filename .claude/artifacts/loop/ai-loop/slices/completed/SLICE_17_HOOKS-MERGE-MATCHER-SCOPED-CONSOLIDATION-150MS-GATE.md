---
id: SLICE-17
title: "Hooks merge + matcher-scoped consolidation, <=150ms gate"
status: completed
feature: FEAT-004
phase: null
priority: P2
target_release: null
requires_validation: false
risk: medium
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-4
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-17: Hooks merge + matcher-scoped consolidation, <=150ms gate

Implements FEAT-004. See [feature file](../../../backlog/in-progress/FEAT-004.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close; AC-4 amended with evidence (reviewer-concurred).

- [x] AC-A: One registration surface — 38 parent registrations -> 36 merged, hand-counted complete by reviewer, matcher-scoping justified per-script; crew script relocation deferred with verified blocker (telemetry-hooks-json hard-assert + unmigrated crew/scripts/lib/telemetry).
- [x] AC-B: Real dedup — pre-push-gate.mts merges blocking crew verifier + soft runner checks, parity verified against both parents, Windows cwd regression self-caught; reviewer-found dropped timeout restored (30s).
- [x] AC-C (amended AC-4): latency measured under two methodologies + reviewer's independent harness (within 2%): sequential 484->427ms, parallel ~196ms; ≤150ms unreachable on Windows (spawn floor ~60ms x 6, unconditional otel ~110ms alone). Dedup real; prompt-based-hooks FEAT is the architectural fix (P4 files it). EVIDENCE: review 20260819T063700Z decision approved.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-004 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
