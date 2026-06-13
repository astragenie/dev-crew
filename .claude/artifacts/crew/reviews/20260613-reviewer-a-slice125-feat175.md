---
slice: SLICE-125
feature: FEAT-175
reviewer: reviewer-a
focus: correctness + AC coverage
commit: 241ec50
result: REJECT
timestamp: 2026-06-13
---
# Review A — SLICE-125 (FEAT-175): Artifact link-integrity checker

## Summary

Tests pass (5/5). AC-2 functional coverage is solid. However the slice
introduces **3 new lint warnings** against a repo policy of zero warnings
(`CLAUDE.md`: "Lint output must be clean. Zero warnings."), so the AC-1
lint-clean gate fails. Two of the three warnings are in the new files
themselves; the third (`complexity`) is in the main library module.
No logic errors found.

---

## Verification evidence

```
bun test src/tests/artifact-linker.test.mts
 5 pass / 0 fail  [96 ms]

bun run lint
main branch:   47 warnings (44 on main before this slice → +3 new)
```

---

## Findings

### F-1 — REJECT (severity: high)
**File:** `src/scripts/lib/artifact-linker.mts:226`
**Rule:** `complexity` — `Async function 'checkArtifactLinks' has a complexity of 21. Maximum allowed is 15.`
**Policy:** CLAUDE.md "ESLint cyclomatic complexity capped at 15 — reduce by extracting helpers, not by suppressing the rule."
**Fix:** Extract the FEAT-validation loop, slice-validation loop, and decision-validation loop into separate private `validate*` helpers. Each currently-inlined block is a clean extraction candidate (`validateFeatLinks`, `validateSliceLinks`, `validateDecisionLinks`). Doing so drops the main function to ~7 cyclomatic complexity.

### F-2 — REJECT (severity: medium)
**File:** `src/scripts/lib/artifact-linker.mts:250`
**Rule:** `@typescript-eslint/no-unused-vars` — `'featId' is assigned a value but never used. Allowed unused vars must match /^_/u`
**Detail:** The destructured `id: featId` in `for (const { id: featId, file, frontmatter } of backlog.files)` is never referenced inside the loop body. Either rename to `_featId` or drop it from the destructuring (`{ file, frontmatter }`).

### F-3 — REJECT (severity: medium)
**File:** `src/tests/artifact-linker.test.mts:17`
**Rule:** `@typescript-eslint/no-unused-vars` — `'num' is assigned a value but never used.`
**Detail:** `const num = id.replace("FEAT-", "");` is computed but never used. The `writeFeat` helper was likely drafted with a numeric suffix in mind, then the approach changed. Delete the `num` assignment. This was flagged in the review instructions as an expected finding.

### F-4 — Advisory (severity: low)
**File:** `src/scripts/lib/artifact-linker.mts`, `buildMermaidGraph` (lines 385-393)
**Detail:** The `addEdge` node-cap guard has a subtle double-condition structure. When `nodesSeen.size < MAX_NODES`, both nodes are unconditionally added before the inner `<= MAX_NODES` emit check, meaning the set can temporarily exceed MAX_NODES by 1 before the emit guard fires. Functionally harmless (at most one phantom node beyond the cap), but the logic is harder to reason about than a simple early-return guard. No behavioral defect; noting for readability.

### F-5 — Informational
The `declined_per` clause-id check is explicitly skipped (line 278, with comment). This is correct — the existing `validate-decline-citations.mts` CI gate owns that contract. No gap.

### F-6 — Informational
`void sliceId` (line 302) and `void decId` (line 321) are used to suppress the "unused variable" lint error for destructured ids that the loop body doesn't reference. These are idiomatic no-ops for the linter but slightly unconventional. Alternative: drop from the destructuring. Not a blocking issue.

---

## AC Coverage

| AC | Status | Evidence |
|----|--------|----------|
| AC-1: `bun test` — all tests pass | PASS | 5/5 tests green |
| AC-1: `bun run lint` — linter clean | FAIL | 3 new warnings: complexity×1, unused-var×2 |
| AC-2: `checkArtifactLinks` returns `{broken, orphaned, mermaid}` | PASS | Interface `LinkReport` defined and returned at line 348 |
| AC-2: detects broken `depends_on` reference | PASS | Test "detects broken depends_on…" passes; line 254-263 |
| AC-2: detects orphaned grade (no matching completed slice) | PASS | Test "detects orphaned grade…" passes; line 336-343 |
| AC-2: `LinkReport.mermaid` contains at least one valid Mermaid edge | PASS | Test "mermaid output contains valid graph TD header…" passes |
| AC-2: ≥5 tests | PASS | Exactly 5 tests in the describe block |

---

## Review decision

**REJECT**

AC-1 (lint clean) is not met. Three new warnings are introduced:
- `complexity` violation on `checkArtifactLinks` (21 vs max 15) — must be fixed by extracting helpers
- `unused-vars` on `featId` in `artifact-linker.mts` — rename to `_featId` or drop from destructuring
- `unused-vars` on `num` in `artifact-linker.test.mts` — remove the unused assignment

All three fixes are mechanical and do not affect functional correctness or test coverage. After fixing, re-run `bun run lint` and confirm `0 warnings` before re-submitting.
