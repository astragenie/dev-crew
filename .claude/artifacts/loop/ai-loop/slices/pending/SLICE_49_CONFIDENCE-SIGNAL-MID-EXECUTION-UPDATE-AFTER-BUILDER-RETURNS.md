---
id: SLICE-49
status: pending
feature: FEAT-046
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-05
updated: 2026-06-05
---
# SLICE-49: Confidence signal mid-execution update after builder returns (SLICE-B of FEAT-010)

Implements FEAT-046. See [feature file](../../../backlog/in-progress/FEAT-046.md) for product context.

## Objective

computeConfidence fires only at slice-start. After builder completes and before reviewer dispatches, loop has new evidence (builder pass/fail, files changed, test output) that could update the confidence signal. This was SLICE-B of FEAT-010 which was closed after SLICE-A shipped the static signal. Value is debatable — builder failure is surfaced separately. Low priority unless loop observer tooling consumes confidence changes. Acceptance criteria: AC-1: slice complete output includes updated confidence field reflecting post-builder evidence. AC-2: confidence can downgrade from green to yellow/red if builder reported failures. AC-3: static slice-start confidence unaffected when no builder report present. AC-4: existing confidence-signal tests pass.

## In scope

- Add post-builder confidence recompute to `slice complete` or the handoff path
- Read builder evidence from slice progress / trajectory to derive updated signal
- Return `updated_confidence` field in `slice complete` output when builder evidence present

## Out of scope

- Changing the static slice-start confidence computation
- Changing how the confidence signal is computed at start (AC-3 guard)

## Acceptance criteria

- [ ] AC-1: `node scripts/loop.mjs slice complete --id SLICE-NN` output includes `updated_confidence` field (green/yellow/red + reason) when builder evidence is available in slice progress
- [ ] AC-2: `updated_confidence` downgrades to yellow/red when builder reported failures (test-fail or build-fail in trajectory)
- [ ] AC-3: `node scripts/loop.mjs slice start` output `confidence` field is unchanged by this change (no regression)
- [ ] AC-4: `npm test` passes; `npm run lint` clean; `npm run typecheck` clean

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-046 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
