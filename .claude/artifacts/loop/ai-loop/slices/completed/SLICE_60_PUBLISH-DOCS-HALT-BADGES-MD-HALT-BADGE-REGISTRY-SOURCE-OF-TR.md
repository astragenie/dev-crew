---
id: SLICE-60
status: completed
feature: FEAT-063
phase: null
priority: P1
target_release: v0.20.0
requires_validation: false
created: 2026-06-06
updated: 2026-06-06
completed_at: 2026-06-06
---
# SLICE-60: Publish docs/halt-badges.md halt-badge registry source-of-truth

Implements FEAT-063. See [feature file](../../../backlog/in-progress/FEAT-063.md) for product context.

## Objective

Publish `docs/halt-badges.md` — the canonical registry for every halt-badge field loop emits in `stop-check.snapshot.*` and `brief.*`. Drives the cross-plugin contract referenced in SPEC-003: future crew brief-me renderer (FEAT-064), loop `--explain-halts` flag (FEAT-065), and schema regression test (FEAT-066) all iterate this registry instead of hard-coding field names.

## In scope

- New `docs/halt-badges.md` documenting every currently-emitted halt-badge field:
  - `snapshot.costRegression` (v0.12.0 — FEAT-055)
  - `snapshot.sessionDrift` (v0.14.0 — FEAT-056)
  - `snapshot.sliceCostCeiling` (pre-existing)
  - `snapshot.gradeTrend` (pre-existing)
- Each entry: field name, shape (TypeScript-style type), meaning, when it fires, suggested operator action, originating FEAT/SLICE
- "How to add a new halt-badge" checklist at the bottom (registry update is mandatory)
- CLAUDE.md reference pointer (load-at-start item)

## Out of scope

- Implementing the loop `--explain-halts` flag (FEAT-065)
- Implementing the brief schema regression test (FEAT-066)
- Implementing crew brief-me rendering (FEAT-064 upstream-request)
- Changing halt-firing thresholds or fail-open logic
- Restructuring the existing snapshot shape

## Acceptance criteria

- [ ] AC-1: All gates green (`npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`)
- [ ] AC-2: `docs/halt-badges.md` exists with all 4 currently-emitted halt-badge fields documented (`costRegression`, `sessionDrift`, `sliceCostCeiling`, `gradeTrend`)
- [ ] AC-3: Each entry includes: field name, TypeScript-style shape, meaning, fire condition, suggested operator action, originating FEAT/SLICE references
- [ ] AC-4: Doc has a "How to add a new halt-badge" checklist at the bottom (registry update is mandatory; FEATs that add halt-badges must update this doc in the same slice)
- [ ] AC-5: CLAUDE.md updated to reference `docs/halt-badges.md` as a load-at-start item (alongside the existing SOP and upstream-requests pointers)
- [ ] AC-6: FEAT-063 backlog body updated with the path to the registry doc so future readers one-click reach it

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-063 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- (none — doc-only slice; lead-attest skip per established v0.17.0 SOP)
