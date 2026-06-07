---
id: GRADE-SLICE-74
slice: SLICE-74
feature: FEAT-073
spec: SPEC-004
phase: 3
target_release: v0.26.0
graded_at: 2026-06-07
duration_hours: 0.75
scores: null
decisions: [DEC-027]
---
# SLICE-74: tsconfig B4 — exactOptionalPropertyTypes — Grade

**Phase:** 3 · **Feature:** FEAT-073 · **Slice:** SLICE-74

## Scores

- architecture_quality: 0.88
- reliability: 0.90
- observability: 0.75
- production_readiness: 0.88
- security: 0.90
- test_confidence: 0.90
- product_completeness: 0.70

## Lessons

- `exactOptionalPropertyTypes` is incompatible with `strictNullChecks: false` — must be overridden to `false` in `tsconfig.test.json`; this is the correct pattern when test and prod configs diverge on null strictness
- Conditional spread pattern (`...(val !== undefined ? { key: val } : {})`) is the right fix when a parameter may be undefined but the interface property is not declared as `| undefined`
- `noUncheckedIndexedAccess` escape hatch worked correctly — dry-run error count check prevented an oversized commit
- product_completeness is 0.70 because B5 was not shipped (only B4)

## Decisions

### DEC-027: Disable exactOptionalPropertyTypes in tsconfig.test.json

**Rationale**: The test config overrides `strictNullChecks: false` for pragmatic reasons (legacy tests written before strict null checks). TypeScript requires strictNullChecks for exactOptionalPropertyTypes to be enforceable. Rather than enable strictNullChecks in test config (which would break many tests), override the flag to false in test-only config.

**Consequences**:
- Test files do not benefit from exactOptionalPropertyTypes checking
- Source files (tsconfig.json) are fully protected by the flag
- This gap will close if/when strictNullChecks is enabled in tsconfig.test.json in a future slice

## Surprises

- 8 source files needed fixes — more than expected for a flag that "only affects optional properties." The pattern was spread operators building options objects with conditionally-present fields.
- Builder returned early (before writing handoff) but had actually completed all the work — the handoff had to be reconstructed from git diff.

## Followups

- B5: `noUncheckedIndexedAccess` — file as FEAT-074; escape hatch was triggered (> 80 errors); requires its own focused slice
- After B5: evaluate B6 (Result<T,E>), B7 (branded IDs), B8 (discriminated unions) — substantial rewrites, may not be worth the cost vs. Phase C perf wins
- Consider enabling strictNullChecks in tsconfig.test.json as a separate slice to close the exactOptionalPropertyTypes gap in tests

## What went well

Escape hatch worked as designed. Reviewer caught all 8 changed files and hand-verified each fix pattern. Clean approval with high confidence.

## What went wrong

Builder returned without writing the handoff artifact — needed manual reconstruction. This is a known subagent fragility when the agent hits an unexpected complexity mid-task.

## What I would do differently next time

Add "escape hatch: if B5 error count > 80, write handoff and return immediately" as an explicit step in the builder prompt, so the builder always writes the handoff before returning.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_74_IMPLEMENT-FEAT-073.md`
- feature file: `.claude/artifacts/loop/backlog/done/FEAT-073.md`
- review artifact: `.claude/artifacts/crew/reviews/20260607T130621Z-review-result-slice-74-exactoptionalpropertytypes-tsconfig-gate.md`
- validation artifact: none (skipped — tsconfig flags only)
