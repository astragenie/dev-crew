---
validation_evidence: "npm test: 920 total / 919 pass / 0 fail / 1 skip; npm run typecheck exit 0; npm run lint exit 0; node scripts/validate-manifests.mjs exit 0 — code-only dead-code deletion, no user-visible behavior path changed"
---
# Review Result: SLICE-69: Delete marker-drain module + caller cleanup in complete-slice

- Created: 2026-06-07T09:14:37.628Z
- Reviewer: reviewer
- Decision: approved
- Summary: All 7 ACs verified independently; 4 files deleted in lockstep (source + compiled), all drain type aliases and parameters stripped from complete-slice, no out-of-scope changes, CI green at 920/919/1.
- Evidence Checked:
  - AC-1: npm test 920 pass / 919 pass / 1 skip (baseline -9 from deleted marker-drain.test.mts
  - re-confirmed); AC-2: npm run typecheck exit 0; AC-3: npm run lint exit 0; AC-4: grep -rn marker-drain|drainPendingDispatchMarkers src tests scripts returns no live code matches (only comment-line references in slice-complete-marker-drain test); AC-5: complete-slice.mts has zero DrainOpts/DrainResult/DrainFn/noMarkerDrain/drainFn/fireMarkerDrain symbols; AC-6: net -4 files (marker-drain.mts
  - marker-drain.test.mts
  - marker-drain.mjs
  - marker-drain.test.mjs); scope clean — auto-dispatch.mts untouched
  - no tsconfig change
  - no opportunistic refactor; compiled .mjs artifacts deleted/modified in lockstep with source; node ./scripts/validate-manifests.mjs passes
- Files Reviewed:
  - src/scripts/lib/marker-drain.mts (deleted)
  - src/tests/marker-drain.test.mts (deleted)
  - scripts/lib/marker-drain.mjs (deleted)
  - tests/marker-drain.test.mjs (deleted)
  - src/scripts/lib/slice-linker/complete-slice.mts (modified)
  - scripts/lib/slice-linker/complete-slice.mjs (modified)
  - src/tests/slice-complete-marker-drain.test.mts (modified)
  - tests/slice-complete-marker-drain.test.mjs (modified)
- Test Adequacy: 3 ceremony smoke tests retained in slice-complete-marker-drain.test.mts covering completeSlice basic path, noMerge path, and no-throw guarantee; drain-specific mock injection tests correctly deleted with the drain module; test file renamed in spirit (comment header updated) but not on disk — minor naming debt, not blocking.

## Validation Evidence

npm test: 920 total / 919 pass / 0 fail / 1 skip; npm run typecheck exit 0; npm run lint exit 0; node scripts/validate-manifests.mjs exit 0 — code-only dead-code deletion, no user-visible behavior path changed
- Risks: Test file src/tests/slice-complete-marker-drain.test.mts retains its drain-themed name after repurpose to ceremony smoke tests — low friction risk on future test discovery; any external caller passing noMarkerDrain or drainFn opts will now have those ignored silently (acknowledged in builder handoff as desired outcome; no CLI callers confirmed by grep).
- Required Follow-up: SLICE-70 (A2): remove marker-write path inside auto-dispatch.mts

