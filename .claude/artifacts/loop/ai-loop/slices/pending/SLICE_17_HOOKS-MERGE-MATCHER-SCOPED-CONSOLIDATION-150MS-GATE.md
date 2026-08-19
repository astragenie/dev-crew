---
id: SLICE-17
title: "Hooks merge + matcher-scoped consolidation, <=150ms gate"
status: pending
feature: FEAT-004
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-4
estimated_tokens: 100000
tags: ["stack:typescript"]
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

> WARNING: ACs copied from FEAT-004 and shared across 6 sibling slices — scope per-slice before close

- [ ] AC-1: Given the command map from unification-plan.md section 2 is applied, When `bun ./src/scripts/validate-agent-refs.mts` runs against the merged tree, Then it exits 0.
- [ ] AC-2: Given the dispatch-token rewrite table (crew:X -> devcrew:X, runner:X -> devcrew:X), When every .md file under commands/, agents/, skills/, CLAUDE.md, and AGENTS.md is grepped for `\bcrew:[a-z-]+\b|\brunner:[a-z-]+\b`, Then every match resolves to an entry in the section-2 map -- zero unmapped tokens.
- [ ] AC-3: Given 4 dev-team agents exceed the 300-line cap before trimming (architect 346, verifier 343, backend-dev 335, release-engineer 326 lines), When `bun ./src/scripts/validate-content-length.mts` runs after the trim slice, Then it exits 0 and each of the four files is <=300 lines.
- [ ] AC-4: Given hooks are consolidated to matcher-scoped registrations, When a representative Bash tool call is measured end-to-end through the hook pipeline, Then the measured overhead is <=150ms -- a measurement above 150ms fails this AC (targets the ~540ms/Bash-call regression named in the plan's risk register).
- [ ] AC-5: Given the merge completes, When one full slice ceremony runs end-to-end under the /devcrew:* namespace, Then it completes with a PASS badge and its artifacts contain zero references to the old /crew: or /runner: command namespaces.

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
