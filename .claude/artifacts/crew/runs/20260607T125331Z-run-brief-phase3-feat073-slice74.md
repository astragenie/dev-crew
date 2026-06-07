---
phase: "3"
feature: FEAT-073
---
# Run Brief: PHASE3 FEAT073 SLICE74

- Created: 2026-06-07T12:53:31.555Z
- Goal: Enable two more graduated tsconfig flags: `exactOptionalPropertyTypes: true` (B4) and `noUncheckedIndexedAccess: true` (B5). Escape hatch: if B5 dry-run reports > 80 errors, ship B4 alone and file a new FEAT for B5.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `tsconfig.json` flag changes (B4 required; B5 if ≤ 80 errors in dry-run)
- Fixing all resulting TS errors across `src/scripts/` and `src/tests/`
- Rebuilding `scripts/` via `npm run build`
- Out Of Scope:
  - - B6+ (Result<T
  - E>
  - branded IDs
  - discriminated unions) — separate FEATs
- Any other flag not listed above
- Planned Files: -
- Next Step: Begin implementation

