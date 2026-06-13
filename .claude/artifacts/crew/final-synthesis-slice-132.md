# Final Synthesis: SLICE-132 — Pre-compute slice risk at `slice from-feature` time (FEAT-200)

**Slice ID:** SLICE-132  
**Feature:** FEAT-200  
**Target Release:** 0.50.1  
**Completed:** 2026-06-13  
**Status:** PASS

## Overview

SLICE-132 implements deterministic slice risk classification to remove lead's manual risk judgment step from the Golden Path. The work is complete, tested, integrated, and shipped.

## What was built

### Core module: `src/scripts/lib/risk-classifier.mts`

Pure function `classifyRisk(feat: FeatFrontmatterForRisk): RiskTier` that deterministically maps FEAT frontmatter to `"low" | "medium" | "high"`.

**Rule table (first match wins):**

- **HIGH** if ANY of:
  - `tags` includes `concern:security`, `concern:governance`, `surface:schema`, or `surface:api`
  - `pm_technical_risk >= 0.7`
  - `category === "security"`
  - `priority === "P0"`
  - `pm_customer_impact >= 0.85`

- **LOW** if NOT already HIGH, and ANY of:
  - `category === "docs"`
  - `tags` includes `docs-only`
  - `pm_technical_risk < 0.3 AND pm_customer_impact < 0.4`

- **MEDIUM** — default for all other cases

Conflict resolution: HIGH wins unconditionally over LOW.

### Integration: `src/scripts/lib/slice-linker/feature-lifecycle.mts`

Risk tier injected at single call site (`buildSliceContent`, line 129):

```typescript
risk: classifyRisk(featureFrontmatter as FeatFrontmatterForRisk),
```

Slice frontmatter now includes `risk:` as a required field. Both code paths that build slices (direct from FEAT via `generateSlicesFromFeature`, indirect from PM classify output via `generateSlicesFromClassify`) pass frontmatter correctly.

### Test suite: `src/tests/risk-classifier.test.mts`

19 tests covering:

- **All 4 HIGH tag variants** (concern:security, concern:governance, surface:schema, surface:api)
- **HIGH numeric boundaries** (pm_technical_risk exactly 0.7, pm_customer_impact exactly 0.85)
- **HIGH category/priority** (category=security, priority=P0)
- **LOW triggers** (category=docs, docs-only tag, both scores low)
- **MEDIUM defaults** (empty object, moderate scores)
- **Conflict resolution** (docs + high technical risk → HIGH, not LOW)
- **Missing/absent fields** (graceful defaults, no throw)
- **Boundary edge cases** (0.69 not ≥ 0.7, 0.3 not < 0.3)

All 8 HIGH trigger variants explicitly tested. AC-7 satisfied.

## Acceptance criteria — all PASS

| AC | Criterion | Evidence | Status |
|---|---|---|---|
| AC-1 | HIGH via security tag | `risk-classifier.test.mts` line 6 | PASS |
| AC-2 | HIGH via pm_technical_risk 0.75 | `risk-classifier.test.mts` line 17 | PASS |
| AC-3 | LOW via docs + low scores | `risk-classifier.test.mts` line 44 | PASS |
| AC-4 | MEDIUM default | `risk-classifier.test.mts` line 62 | PASS |
| AC-5 | slice from-feature writes risk field | `feature-lifecycle.mts` line 129 | PASS |
| AC-6 | Missing fields default gracefully | `risk-classifier.test.mts` line 80 + implementation | PASS |
| AC-7 | All HIGH triggers tested | 8 trigger variants + boundaries | PASS |

## Quality signals

### Grade scores (all positive)

- **architecture_quality: 0.90** — Pure function, single responsibility, minimal injection point. Multi-function rule table slightly reduces clarity.
- **reliability: 0.88** — Null-coalescing on all numeric fields, HIGH-before-LOW order correct. Type annotation mismatch handled gracefully but via comments.
- **observability: 0.80** — Excellent JSDoc comments. Low score reflects plugin-dev stack (no runtime telemetry). Expected per project memory.
- **production_readiness: 0.88** — Ready to ship. Future advisory (not blocking): category enum normalization to prevent silent mismatches on case/spelling drift.
- **security: 0.90** — Pure function, no I/O, no user input parsing. Frontmatter validation upstream.
- **test_confidence: 0.92** — 19 tests, comprehensive coverage. Minor gap: no explicit test for `tags` field absent (only empty `[]` tested).
- **product_completeness: 0.90** — All AC covered end-to-end. AC-5 integration noted as non-blocking by Reviewer A (direct slice creation out-of-scope).

### Verification gates

- ✓ All 19 tests pass (`bun test src/tests/risk-classifier.test.mts`)
- ✓ Linting clean (ESLint, Prettier)
- ✓ TypeScript passes (`tsc --noEmit`)
- ✓ Manifest valid (`validate-manifests.mts`)
- ✓ Content length valid (classifier 63 lines < 400 cap; tests 91 lines < cap)
- ✓ No secrets committed
- ✓ No CI gates broken

### Reviewer sign-off

- **Reviewer A (Correctness):** PASS. All AC covered. AC-5 integration gap noted as non-blocking (slice creation surface orthogonal to risk classification).
- **Reviewer B (Production-readiness):** PASS. Future-proofing advisory on category enum (non-blocking). No production risks.

## Impact

Removes one of lead's two manual judgment steps in Frame → Classify → Pick → Dispatch flow. Reduces rationalization surfaces that can lead to "just checking" Bash escapes. Aligns with broader lead-dispatch-discipline initiative (FEAT-200 derived from 2026-06-11 diagnostic).

Paired hero-crew agent update (`agents/lead.md`) remains out of scope per FEAT-200 definition — cross-repo coordination acknowledged in risks.

## Files changed

| Path | Change | Lines |
|---|---|---|
| `src/scripts/lib/risk-classifier.mts` | created | +63 |
| `src/scripts/lib/slice-linker/feature-lifecycle.mts` | edited | +3 |
| `src/tests/risk-classifier.test.mts` | created | +91 |
| `CHANGELOG.md` | edited | +7 (v0.50.1 release notes) |
| `.claude/artifacts/loop/backlog/done/FEAT-200.md` | moved/updated | status=done, target_release=0.50.1 |
| `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_132_...md` | moved/updated | status=done |
| `.claude/artifacts/loop/grades/2026-06-13T131719-feat200-slice132-grade.md` | created | grade artifact |

## Key lesson for future slices

When adding a required field to a shared type, grep all call sites before declaring done. This FEAT added `risk:` to slice frontmatter (required field) at one injection point. Two code paths call that function; both were verified to pass frontmatter correctly. A miss on either would have silently created slices with `risk: undefined`, failing validation at CI gate.

Recommend formalizing this as a pre-commit check: frontmatter parser or CI gate validation that **all** slice files MUST have `risk:` field defined.

## Confidence and next steps

**Grader confidence:** 0.94  
**Next steps:** None. Slice is closed. Feature is done. Ready for next backlog item.

---

Generated by `crew:document-writer` at close ceremony time.  
Grade file: `.claude/artifacts/loop/grades/2026-06-13T131719-feat200-slice132-grade.md`
