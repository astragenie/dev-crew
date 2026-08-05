---
decision: approved_with_notes
---

# Review result — SLICE-204 (FEAT-288 AC-2)

**Decision: APPROVED_WITH_NOTES**

- Reviewer: independent review (crew:reviewer role), dispatched by team lead
- Commit reviewed: `3c773823` on `main` — "fix(SLICE-204): re-verify FEAT-276
  AC-4 close record + promote missing-confidence to ERROR"
- Files: `.claude/artifacts/loop/backlog/done/FEAT-276.md`,
  `src/scripts/validate-slice-touches-files.mts`,
  `src/tests/wave/validate-touches-files.test.mts`
- Parent FEAT: `.claude/artifacts/loop/backlog/in-progress/FEAT-288.md` (not
  yet closed — this is SLICE-2 of 2; SLICE-203, the parser fix, is the
  sibling already merged at `1b3eab6e` and is an ancestor of this commit)

## 1. ERROR-vs-WARN discrimination — verified directly, not by reading code

Built a throwaway probe repo and ran `validateRepo` against six synthetic
slices, independent of the shipped test suite:

| case | result |
|---|---|
| key commented out (`# touches_files: [a.mts]`) | WARN (correct — not a declaration) |
| `touches_files:` mentioned only in body prose, not frontmatter | WARN (correct) |
| empty inline array with irregular spacing (`touches_files:    []`) | ERROR (correct) |
| different key casing (`Touches_Files: []`) | WARN, not ERROR |
| no space after colon (`touches_files:[]`) | ERROR (correct) |
| field omitted entirely (baseline) | WARN (correct) |

No input made an *omitting* slice ERROR. The casing case is a theoretical
gap (`TOUCHES_FILES_KEY_RE` is case-sensitive) but poses no real risk: the
key is machine-emitted by `slice-store.mts`'s frontmatter serializer, always
lowercase — no in-repo writer or hand-authored slice uses alternate casing
today. Not a blocker, not worth a follow-up given the tripwire's narrow
purpose (catching regressions in the real writer/reader pair, not policing
hand-typed frontmatter).

Also spot-checked that `TOUCHES_FILES_KEY_RE` (`/^touches_files:\s*/m`)
cannot false-positive against the pre-existing `touches_files_confidence:`
key used elsewhere in the test suite — the char after `touches_files` in
that key is `_`, not `:`, so it can't match. Consistent with the existing
"touches_files_confidence: declared" fixture in
`validate-touches-files.test.mts` continuing to pass.

## 2. Real backlog scan — reproduced, all clean

```
bun ./src/scripts/validate-slice-touches-files.mts
Scanned 25 slice files; 9 warnings, 0 errors
```

All 9 warnings are the omitted-field `touches_files missing (created ...)`
form — none are the new declared-but-missing ERROR. File count differs from
the builder's reported 26 (25 here) purely from ordinary backlog churn
between the builder's run and this review (SLICE-194 moved to `completed/`
in the interim) — not a defect in this slice.

## 3. FEAT-276 correction — scope and substance

**Scope:** confirmed via diff against the pre-commit version. The correction
is a single new section inserted before `## Description`; frontmatter
(`status: done`, `completed_at`, `slices_complete`) is byte-identical, and
`## Acceptance criteria` through `## Proposed slices` is byte-identical
(diffed directly, not eyeballed). FEAT-276 was not reopened and stays in
`done/`. Only AC-4 is addressed; AC-1/2/3/5 are untouched.

**Substance — the round-trip claim, checked against the actual SLICE-181
review, not accepted on the builder's word:**

- Read `20260803T203000Z-review-result-slice-181-touches-files-creation-writers.md`
  directly. Its item 3 ("Idempotency / non-clobbering: verified") cites the
  new test "omits touches_files frontmatter when the caller resolves
  nothing" in `backlog-store-slices.test.mts` as confirmation.
- Checked that test file at the reviewed commit (`44e2f78b`): it imports
  `parseFrontmatter`, not `readTouchesFiles`, and asserts
  `frontmatter.touches_files` equals a JS array/`undefined` — it never
  invokes the reader at all. The review's claim that `readTouchesFiles`
  "independently requires ... confirmed by the new test" was actually two
  separate things conflated into one: a source-reading argument about the
  reader, plus a test that only checked the writer's frontmatter shape.
  No round trip through both halves was exercised.
- Confirmed the pre-existing `readTouchesFiles` tests (`touches-files.test.mts`,
  from FEAT-277, unchanged by SLICE-181) use hand-written block-style YAML
  fixtures via `writeFileSync` — a real file, but not the writer's actual
  inline-array serialization. So "real file" existed in testing, but never
  one produced by the real writer.
- Verified the live defect directly: `SLICE_187_...md` (completed, real
  writer output) has `touches_files: [hooks/report-gate.mjs, ...]` (inline
  array). Ran `readTouchesFiles` against it: today (post-SLICE-203) it
  correctly returns `confidence: "declared"` with the three paths — matching
  the correction's claim that this exact form is what was broken and is now
  fixed.

**One wording nitpick, not blocking:** the correction's phrase "exercised
`readTouchesFiles` against directly-constructed JS arrays" slightly
mischaracterizes what happened — the cited test didn't call
`readTouchesFiles` at all, it compared parsed frontmatter to a JS array
literal. The substance (no real round trip was tested, and the review's
claim of independent reader confirmation was overstated) holds and is, if
anything, understated by this imprecision rather than undermined by it.
Worth a one-clause tightening if anyone touches this file again; not worth
blocking or re-opening for.

The three-way verdict (write path true / round trip false-then-fixed /
current outcome vacuous pending FEAT-292) is accurate and appropriately
hedged — it doesn't overclaim a clean PASS where one isn't warranted.

## 4. Complexity

`classifyMissingConfidence` extraction: confirmed via `bunx biome lint` on
both changed source files — zero findings, no `biome-ignore` or
complexity-suppression comments anywhere in the file. Cap is met by
structural extraction, not suppression.

## 5. Gates run independently

- `bunx tsc --project tsconfig.json --noEmit` → clean
- `bunx tsc --project tsconfig.test.json --noEmit` → clean
  (the TS6192 failure flagged as pre-existing/concurrent state resolved
  itself once SLICE-192 and SLICE-202 landed on `main` during this review;
  `3c773823` is confirmed an ancestor of the current clean HEAD `78e0d6ab`,
  and `feature-lifecycle.mts` is untouched by SLICE-204 — not attributing
  it here)
- `bunx biome lint` / `bunx biome format` on both changed files → clean
- `bun test src/tests/wave/validate-touches-files.test.mts` → 9 pass, 0 fail
- `bun test src/tests/ --parallel --timeout 60000` → first run 1 fail /
  3292 pass; immediate re-run clean at 3293 pass / 0 fail / 7 skip. The
  single failure did not reproduce and is consistent with the
  already-documented FEAT-286 flakiness under parallel load, not attributed
  to this slice.
- `bun ./src/scripts/validate-manifests.mts`, `validate-content-length.mts`,
  `validate-org-refs.mts` → all OK (unrelated to this slice's scope, run for
  completeness)

## Recommendation

**APPROVED_WITH_NOTES.** No blocking findings. The gate promotion is
correctly scoped — it cannot fire on field omission, confirmed by direct
probing rather than code reading — and the FEAT-276 correction is honest
about what the original close verified versus what it's actually true
today. Two non-blocking notes recorded above (casing case-sensitivity in
`declaresTouchesFiles`; one imprecise sentence in the correction's framing
of the SLICE-181 review's test coverage) — neither warrants a follow-up
FEAT on its own.
