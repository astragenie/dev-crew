---
slice: SLICE-153
feature: FEAT-250
reviewer: crew:reviewer (independent review)
commit: 49e2d3da
branch: wave3-SLICE-153
decision: approved
---

# Review: SLICE-153 — CI allowlist guard + CLAUDE.md CI-list registration + DORA A2 parity

## Verdict: PASS

## Scope reviewed

`git diff origin/main...HEAD` — source, CI config, CLAUDE.md only (ceremony artifacts ignored):
- `src/scripts/validate-backlog-writes.mts` (new)
- `src/tests/validate-backlog-writes.test.mts` (new)
- `src/scripts/lib/artifact-linkage.mts`, `src/scripts/lib/slice-linker/complete-slice.mts`,
  `src/scripts/lib/slice-linker/start-slice.mts` (straggler migrations)
- `.github/workflows/ci.yml`, `CLAUDE.md`

## Independently re-verified

- `bunx tsc --project tsconfig.json --noEmit` — clean
- `bunx tsc --project tsconfig.test.json --noEmit` — clean
- `bun test src/tests/validate-backlog-writes.test.mts src/tests/backlog-state-emitter-dora-fields.test.mts src/tests/backlog-writer.test.mts src/tests/wave/failure-pivot.test.mts` — 29 pass / 0 fail
- `bun test src/tests/agent-report-writer.test.mts src/tests/integrations.test.mts` (covers `linkArtifactToSlice`) — 25 pass / 0 fail
- `bun ./src/scripts/validate-backlog-writes.mts` against the real tree — OK, zero findings
- `bunx biome lint` / `format` on the 5 touched source files — clean; the two
  `noExcessiveCognitiveComplexity` warnings on `computeFeatureResult` /
  `startSlice` pre-date this diff (confirmed identical against `origin/main`
  copies of those two files) — not introduced here.

## Findings

**[INFO] `src/scripts/validate-backlog-writes.mts:38-42`** — Detection is by
literal call-site argument identifier name (`sliceFile|slicePath|featureFile|
featureFilePath`), not by data/taint flow. A future raw writer using any other
variable name (e.g. `dest`, `output`, a destructured alias) would silently
bypass the gate. This is called out honestly in the module's own doc comment
as a deliberate precision-over-recall tradeoff, and it does catch the exact
naming convention the real historical stragglers used (confirmed: the
pre-migration `complete-slice.mts`, `artifact-linkage.mts`, and
`start-slice.mts` all used exactly these identifier names). Not blocking —
AC-5 asks for an explicit allowlist gate in the `validate-imports.mts` style,
which this delivers; it does not ask for taint-flow-grade detection. Worth a
`docs/upstream-requests`-style backlog note if the gate is expected to catch
novel bypass patterns rather than regressions of the known pattern.

**[INFO]** The `doctor.mts` and `pm-apply.mts` allowlist entries are
currently inert against the *actual* content of those two files — neither
file's real write call sites use the flagged identifier names (`doctor.mts`
uses `strayEntry.file`/`destFile`/`winFile`/`loserPath`/`reportPath`;
`pm-apply.mts` uses `filePath`/`entry.filePath`), so today's guard would pass
both files even without the allowlist entries. The test suite proves the
allowlist *mechanism* works via synthetic fixtures using the flagged names,
which is the right test design (doesn't couple the test to real file
content) — but it means the allowlist's practical value is defensive/future
-proofing rather than presently load-bearing. Not a defect; noting for
awareness only.

## AC verification

- **AC-2** (FEAT-247 DORA A2 test stays unmodified): confirmed —
  `git diff origin/main...HEAD -- src/tests/backlog-state-emitter-dora-fields.test.mts
  src/tests/backlog-writer.test.mts` is empty. Re-ran both files: pass.
- **AC-3 / AC-5** (no raw fs write against slice files outside BacklogStore;
  explicit allowlist gate): confirmed by direct grep of `complete-slice.mts`
  and `start-slice.mts` for `fs.writeFile(Sync)?|rename(Sync)?|unlink` — the
  only remaining raw writes are `gradeFile` (grade artifact, not backlog
  state) and `statePath` (workflow-state JSON, not backlog state), both
  correctly out of scope. `writeWorktreePathToFrontmatter` has exactly one
  call site and its signature/call site are updated in lockstep — the
  "prior session left it half-done/breaking compile" concern is resolved;
  tsc is clean.
- **AC-4** (`wave/failure-pivot.mts` port-vs-exception): out of scope for
  this diff — confirmed already resolved in an earlier FEAT-250 slice
  (SLICE-3 per the inline comment at `failure-pivot.mts:59-63`, DEC-076
  decision 2: ported to `mergeFrontmatter`), not something this slice needed
  to touch.
- **Straggler migrations behavior-preserving**: `artifact-linkage.mts`'s
  `linkArtifactToSlice` now goes through `updateSliceFrontmatter` →
  `mergeAndWriteFrontmatter`, which stamps an `updated: nowIsoDate()` field
  the old inline `serializeFrontmatter` call did not add. This is not a
  regression specific to this diff — it's the pre-existing, already-shipped
  `BacklogStore` contract (`updateFeatureFrontmatter` has stamped `updated`
  since earlier FEAT-250 slices; `mergeAndWriteFrontmatter` is the same
  primitive shared by both). No fields are dropped; existing tests covering
  `linkArtifactToSlice` (`agent-report-writer.test.mts`,
  `integrations.test.mts`) still pass. `complete-slice.mts`'s
  `updateSlicesComplete` (previously a direct `mergeFrontmatter`+`writeFile`
  contradicting the DEC-076 sole-writer claim) now correctly routes through
  `updateFeatureFrontmatter` — that pre-existing gap is closed.
- **ci.yml / CLAUDE.md registration**: new step ordered consistently
  between `validate-imports.mts` and `validate-snapshot-freshness.mts` in
  both the workflow's `validators:` block and the CLAUDE.md numbered list;
  numbering renumbered correctly (10/11/12), description matches actual
  guard behavior.

## Conclusion

Guard correctness, straggler-migration behavior preservation, and the CI/
CLAUDE.md registration are all sound. The identifier-name-based detection is
narrower than a general-purpose "no raw fs writes on backlog paths" rule
would be, but that is the documented, intentional design point (explicit
allowlist over blanket rule, per COND-D), it catches the actual historical
regression pattern, and every re-run I did (tsc x2, targeted test suites,
lint/format, live guard run) came back clean. **PASS.**
