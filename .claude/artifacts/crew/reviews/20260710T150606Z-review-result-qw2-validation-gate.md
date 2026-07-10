---
decision: approved
reviewer: crew:reviewer (independent, read-only)
target_commit: 174de13a
branch: fix/qw2
files_reviewed:
  - src/scripts/lib/validation-gate.mts
  - src/tests/validation-gate.test.mts
---

# Review result — QW2 validation-gate hardening

## Decision: APPROVED

## Scope

`src/scripts/lib/validation-gate.mts` (+163/-35 net, diff shows a 90-line
insertion block plus a 34-line deletion of inlined logic replaced by a call
to the new `resolveVerdictOutcome` helper) and additive-only test coverage
in `src/tests/validation-gate.test.mts` (+82 lines, 11 new test cases: a
7-case decision-synonym loop, 1 unrecognized-decision case, 3 filename
boundary/combined-slice cases).

## Verification performed

1. **Pre-existing test assertions unmodified.** `git diff origin/main...HEAD -- src/tests/` is a pure append — the diff hunk starts after the final pre-existing test's closing brace; no existing `test(...)` block's body or assertion changed.
2. **Downstream consumers of `.reason`.** Grepped `src/scripts` and `src/tests` for the old literal strings (`"a failed validation cannot close"`, `"validation artifact decision"`, `"unrecognized decision"`) outside the two touched files — zero hits. `complete-slice.mts:148-150,329-333` interpolates `validationGate.reason` as free text (`` `validation-gate: ${validationGate?.reason ?? "no evidence"}` `` etc.) with no substring/equality match on the reason body, so the added `[normalized from '<orig>']` suffix and the new `unrecognized decision '<x>' — expected pass|fail|skipped` wording are both consumer-safe.
3. **Token extraction edge cases** (hand-verified against the actual `sliceNumericId` / `extractSliceNumberTokens` implementations via a standalone Node repro, not just the shipped tests):
   - `slice-157-158-deploy.md` queried with `SLICE-1570` → no match (confirms the fix holds beyond the shipped `SLICE-15` case — a longer non-matching numeric prefix also correctly misses).
   - `SLICE-05` vs `slice-5` / `slice-05` filenames → both normalize through `parseInt` to `"5"` and match; the old dual padded+unpadded token scheme is subsumed by the numeric-set comparison, not just coincidentally preserved.
   - `slice_158-x.md` (underscore style) → matches `SLICE-158` (regex `slice[-_]?` handles both separators).
   - `slice-157-158-linear-x.md` (extra trailing segment after the combined run) → still yields `{157, 158}`.
   - Plural `slices-158-159-deploy.md` → does **not** match under the new numeric path. Checked whether this is a regression: the **old** substring scheme (`lower.includes("slice158")` / `"slice-158"` / `"slice_158"`) also does not match `"slices-158"` (the literal substring `slice-158` isn't present — there's an interposed `s`). Same miss both before and after; not a regression, just an already-existing non-goal. Not covered by a test either way, worth a follow-up note but not a blocker for this fix.
4. **Fallback path for non-numeric ids.** `sliceNumericId` returns `null` for any `sliceId` not shaped `SLICE[-_]?<digits>`; `findValidationArtifacts` then falls through to the untouched `normalizeSliceId` + substring `tokens.some(...)` path, identical to pre-existing behavior. Confirmed by reading the control flow (`continue` inside the `numericId !== null` branch only, so non-numeric ids never enter that branch).
5. **Review-gate independence.** `git diff origin/main...HEAD -- src/scripts/lib/review-gate.mts` is empty (file untouched). Grepped for `normalizeDecision|DECISION_ALIASES|resolveVerdictOutcome|extractSliceNumberTokens|sliceNumericId` across `src/scripts` — all five symbols exist only in `validation-gate.mts`, none exported/imported elsewhere. The claimed vocabulary isolation (review-gate keeps `approved`/`approved_with_notes`/`rejected`, unaffected by the new `pass|fail|skipped` alias table) holds structurally, not just by convention.

## Evidence reproduced independently

- `bun test src/tests/validation-gate.test.mts` → **24 pass, 0 fail** (13 pre-existing + 11 new test declarations, one of which is a 7-iteration loop → 24 total runtime tests, matches expectation).
- `bun test src/tests/ --parallel --timeout 60000` → **2669 pass, 1 skip, 1 fail** (not 2670/0 as the build claim stated, but the delta is explained below), 279 files.
  - The one failure is `memory-transport.test.mts` ("discovers the env-pinned plugin root and delivers via its selector"), unrelated to this diff — `validation-gate.mts`/its test file don't touch memory-transport code paths. Reran `bun test src/tests/memory-transport.test.mts` standalone → **9 pass, 0 fail**, confirming this is a parallel-run flake, not something this change introduced. This matches an already-tracked open item (QW1: memory-transport flake hermetic) in the team's task list — not a defect of this slice.
- `bunx tsc --project tsconfig.json --noEmit` → clean.
- `bunx tsc --project tsconfig.test.json --noEmit` → clean.
- `bunx biome lint src/scripts/lib/validation-gate.mts src/tests/validation-gate.test.mts` → clean.
- `bunx biome format src/scripts/lib/validation-gate.mts src/tests/validation-gate.test.mts` (check mode) → clean, no reformatting needed.

## Findings

No blocking findings.

- **[NIT] `src/scripts/lib/validation-gate.mts`** — plural `slices-NNN-...` filenames are not matched by either the old or new scheme; not a regression introduced by this change, but the doc comment on `extractSliceNumberTokens` could note it as an explicit non-goal so a future reader doesn't assume plural forms are covered. Non-blocking.

## Verdict

PASS. The decision-alias normalization narrows (not widens) what's treated as a pass/skip — only exact known synonyms map to `pass`/`skipped`; anything else degrades to an explicit "unrecognized decision" failure rather than silently succeeding or silently implying a hard fail, which is the right direction for a close-gate. The filename-token fix is a genuine boundary-condition correctness fix (verified beyond the shipped test cases) with no observed regression in the fallback or review-gate paths. Approved.
