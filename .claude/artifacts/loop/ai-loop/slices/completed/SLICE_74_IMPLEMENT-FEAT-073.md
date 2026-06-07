---
id: SLICE-74
status: completed
feature: FEAT-073
phase: 3
priority: P1
target_release: v0.26.0
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
tags: ["stack:node", "surface:none", "concern:types"]
completed_at: 2026-06-07
---
# SLICE-74: tsconfig B4+B5 — exactOptionalPropertyTypes + noUncheckedIndexedAccess

Implements FEAT-073. See [feature file](../../../backlog/in-progress/FEAT-073.md) for product context.

## Objective

Enable two more graduated tsconfig flags: `exactOptionalPropertyTypes: true` (B4) and `noUncheckedIndexedAccess: true` (B5). Escape hatch: if B5 dry-run reports > 80 errors, ship B4 alone and file a new FEAT for B5.

## In scope

- `tsconfig.json` flag changes (B4 required; B5 if ≤ 80 errors in dry-run)
- Fixing all resulting TS errors across `src/scripts/` and `src/tests/`
- Rebuilding `scripts/` via `npm run build`

## Out of scope

- B6+ (Result<T,E>, branded IDs, discriminated unions) — separate FEATs
- Any other flag not listed above

## Acceptance criteria

- [ ] AC-1: `tsconfig.json` has `"exactOptionalPropertyTypes": true` in `compilerOptions` (B4); `"noUncheckedIndexedAccess": true` also present unless escape hatch triggered
- [ ] AC-2: `npm run typecheck` exits 0 — evidence: command output
- [ ] AC-3: `npm run lint` exits 0, zero warnings — evidence: command output
- [ ] AC-4: `npm run format:check` exits 0 — evidence: command output
- [ ] AC-5: `npm test` exits 0 with all tests passing — evidence: test summary line

## Done When

- all AC pass with evidence
- `requires_validation: false` — no runtime behavior change
- feature FEAT-073 moved to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: crew:reviewer (verify narrowing patterns are correct; no runtime logic removed)
- Reviewer B: n/a
