---
id: SLICE-81
status: completed
feature: FEAT-054
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-07
updated: 2026-06-08
completed_at: 2026-06-08
---
# SLICE-81: Implement FEAT-054

Implements FEAT-054. See [feature file](../../../backlog/in-progress/FEAT-054.md) for product context.

## Objective

/crew:orchestrate-slice's Step 4 (reviewer) → Step 5 (validator) order assumes reviewer reliably produces an artifact. Observed in SLICE-51: reviewer paused twice mid-investigation without writing the review-result.

## In scope

- Document conditional reviewer↔validator swap in hero-crew (`/crew:orchestrate-slice` skill or `agents/lead.md`)
- Define "short" gate: AC count ≤6 OR changed-files ≤10 (lower wins)
- Spec reviewer prompt change: receives validation-result path as additional input when order is swapped
- Confirm default (reviewer-first) for long slices (≥10 files OR ≥7 ACs OR cross-plugin)

## Out of scope

- Implementation in this (loop) repo — all code changes live in hero-crew
- Changes to loop source, CLI, or skills
- FEAT-052 reviewer-reliability work (separate FEAT)

## Acceptance criteria

- [ ] Document the conditional reordering in /crew:orchestrate-slice or in a new section of agents/lead.md: when slice scope is short AND BEHAVIOR_CHANGED, swap Step 4 and Step 5
- [ ] Define 'short' precisely: AC count ≤6 OR builder handoff changed-files count ≤10 (use the lower-bar gate)
- [ ] Reviewer prompt in the swapped order receives validation-result path as additional input — reviewer can confirm validator findings rather than independently re-verify
- [ ] Default to current order for long slices (cross-plugin, ≥10 files, ≥7 ACs)
- [ ] Tests: dispatch ordering follows the size heuristic correctly

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-054 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: `crew:reviewer` — verify spec completeness, short-gate definition correctness, reviewer-prompt change
- Reviewer B: `loop:researcher` — confirm GRADE-SLICE-51 recommendation aligns with documented spec
