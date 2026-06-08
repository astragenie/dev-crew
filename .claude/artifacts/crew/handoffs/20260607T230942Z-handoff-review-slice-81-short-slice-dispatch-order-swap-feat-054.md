# Task Handoff: Fix: SLICE-81 isShortSlice implementation + tests (FEAT-054)

- Created: 2026-06-07T23:09:42.458Z
- Updated: 2026-06-07T23:50:00.000Z
- From: builder
- To: lead
- Objective: Implement `isShortSlice()` in `scripts/orchestrate-slice-classify.ts` and add ≥7 unit tests covering all boundary cases including cross-plugin override.
- Allowed Scope:
  - C:/work/mega/hero-crew/scripts/orchestrate-slice-classify.ts
  - C:/work/mega/hero-crew/tests/orchestrate-slice.test.ts
- Forbidden Scope: all other files
- Deliverable: `isShortSlice()` exported from classify module, 7 unit tests passing, all 446 suite tests green.

## What changed

### scripts/orchestrate-slice-classify.ts
Added `isShortSlice()` export before `classifySlice()`:
```typescript
export function isShortSlice(opts: {
  acCount: number;
  changedFilesCount: number;
  crossPlugin?: boolean;
}): boolean {
  if (opts.crossPlugin) return false;
  return opts.acCount <= 6 || opts.changedFilesCount <= 10;
}
```

### tests/orchestrate-slice.test.ts
- Added `isShortSlice` to the import line.
- Added 7 unit tests covering:
  1. `acCount ≤ 6, changedFilesCount > 10` → true (AC count alone qualifies)
  2. `acCount > 6, changedFilesCount ≤ 10` → true (file count alone qualifies)
  3. `acCount ≤ 6, changedFilesCount ≤ 10` → true (both qualify)
  4. `acCount > 6, changedFilesCount > 10` → false (neither qualifies)
  5. `acCount = 6, changedFilesCount = 10` → true (boundary: both at limit)
  6. `acCount = 7, changedFilesCount = 11` → false (boundary: both just over)
  7. `acCount = 4, changedFilesCount = 5, crossPlugin: true` → false (cross-plugin override)

### commands/orchestrate-slice.md (no change needed)
Doc at line ~356 already correctly references `isShortSlice()` — confirmed PASS (AC1).

## Changed Files
- C:/work/mega/hero-crew/scripts/orchestrate-slice-classify.ts
- C:/work/mega/hero-crew/tests/orchestrate-slice.test.ts

## Self-Verify Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0, zero warnings) |
| `npm run format:check` | PASS (exit 0) |
| `node --test --experimental-strip-types tests/orchestrate-slice.test.ts` | PASS — 17/17 (10 original + 7 new isShortSlice tests) |
| `node --test --experimental-strip-types tests/*.test.ts` (full suite) | PASS — 446/446 |

## Confidence
high

## Risks
none — all 7 documented boundary cases are covered and passing; cross-plugin override is tested.

## Suggested Next Handoff
crew:reviewer — independent review of the two changed files to confirm SLICE-81 is now ready to close.
