---
phase: "3"
feature: FEAT-070
---
# Run Brief: PHASE3 FEAT070 SLICE72

- Created: 2026-06-07T10:05:57.157Z
- Goal: Add `"noImplicitAny": true` and `"noImplicitAny": true, "useUnknownInCatchVariables": true` to `tsconfig.json` (and `tsconfig.test.json` if applicable) and fix all resulting type errors across `src/scripts/` and `src/tests/`. This is the first graduated tsconfig tightening slice — it does NOT touch `noUnusedLocals`, `noUnusedParameters`, or any other flag (those are B2+).
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `tsconfig.json` — add `"noImplicitAny": true`
  - `"useUnknownInCatchVariables": true`
- `tsconfig.test.json` — same two flags if the file exists and inherits separately
- All `.mts` source files under `src/scripts/` that produce type errors under the new flags
- All `.mts` test files under `src/tests/` that produce type errors under the new flags
- Compiled `.mjs` artifacts: rebuild via `npm run build` after all fixes

The fix strategy for `: any` parameters:
- Replace `param: any` with the narrowest concrete type inferred from usage (no `as any` casting)
- For truly heterogeneous shapes
  - use `unknown` and add a type guard
  - or use a discriminated union if one already exists
- For catch blocks: change `catch (e)` → `catch (e: unknown)` and narrow before use (`instanceof Error`
  - `String(e)`
- Out Of Scope:
  - - `noUnusedLocals`
  - `noUnusedParameters` (B2)
- `noImplicitOverride`
  - `noFallthroughCasesInSwitch` (B3)
- `exactOptionalPropertyTypes` (B4)
- `noUncheckedIndexedAccess` (B5)
- Result<T
  - E>
  - branded IDs
  - discriminated unions (B6–B8)
- Adding `@ts-suppress` or `// @ts-ignore` annotations — not allowed
- Suppressing ESLint rules to hide type issues
- Planned Files: -
- Next Step: Begin implementation

