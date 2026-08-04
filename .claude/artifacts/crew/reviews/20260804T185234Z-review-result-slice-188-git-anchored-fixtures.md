---
slice: SLICE-188
feature: FEAT-284
kind: review-result
status: completed
decision: approved_with_notes
reviewer: independent (crew:reviewer)
date: 2026-08-04
---

## Change under review

Commit `3bd6ab95` on `main` (parent `a3d0a07c`), single file
`src/tests/git-anchored-completion.test.mts` (+172/-4). Confirmed via
`git diff a3d0a07c 3bd6ab95 --name-only` — no other file in the commit.

## 1. Scope discipline — PASS

Only `src/tests/git-anchored-completion.test.mts` changed. Read
`src/scripts/lib/slice-linker/git-anchored-completion.mts` in full: the
matcher (`reconcileProposedSlicesAgainstGit`) still only regex-matches
commit subject/body text (lines 151-171 of that file) — no diff inspection,
no `touches_files` read anywhere in that module. Matcher behavior is
unchanged, as the commit message claims.

## 2. Backward compatibility — PASS

`tmpGitRepo`'s parameter widened from `string[]` to `CommitInput[]`
(`string | CommitSpec`), and `commitFixture` falls back to
`git commit --allow-empty` whenever `files` is absent/empty
(git-anchored-completion.test.mts:84-91). Every pre-existing call site
(`gac-ref-`, `gac-stale-origin-`, `gac-hit-`, `gac-miss-`, and both e2e
fixtures at lines 363 and 383) still passes plain subject strings, which
route through the identical `--allow-empty` path — confirmed by reading, and
by the full 19/19 pass run below. The two e2e tests
(`sliceFromFeature skips shipped prefix...` and `...refuses a fully-shipped
FEAT...`, lines 362-406) were correctly left untouched: they exercise
`planReconcileAction`'s prefix/refuse logic, not diff-shape, so they don't
need a files-touching fixture. Right call to leave them alone.

## 3. Fixture fidelity — mostly PASS, one real hole (see note below)

- Empty-commit (line 246-261): `--allow-empty`, changes zero files.
  Cleanly invertible by an AC-1 "must have changed ≥1 file" rule.
- Docs-only / 71604bb4 shape (line 263-282): real commit touching
  `docs/research/design-notes.md`, prose mentions both tokens.
- Real-source positive control (line 284-300): touches
  `src/scripts/lib/thing.mts`, asserts `shipped == [1]` as *correct*
  (non-defect) behavior — good, this is the case a diff-corroboration
  implementation must keep passing.
- `touches_files` overlap / no-overlap pair (line 302-358): both fixtures
  commit real files and declare `touches_files` on the proposed slice; one
  overlaps the changed path, one doesn't. `touches_files` is a real optional
  field on `ProposedSlice` (`src/scripts/lib/proposed-slices.mts:49`), so
  these type-check legitimately, not through an `any` escape hatch.

**Note (not blocking, but worth surfacing before SLICE-189 starts):** the
docs-only "KNOWN DEFECT" fixture (line 263-282) does **not** declare
`touches_files` on its proposed slice. Re-reading FEAT-284's AC-1 and AC-2
literally: AC-1 only requires "changed at least one file" (this commit
changes one — `docs/research/design-notes.md` — so it clears that bar), and
AC-2's downgrade-on-zero-overlap only fires "given a proposed slice declares
`touches_files`" — which this fixture's proposed slice does not. So a
SLICE-189 implementation that satisfies AC-1 and AC-2 exactly as currently
worded would **not** invert this specific test: the file-changed check
passes, and there's no `touches_files` to compare against, so it stays
`shipped == [1]`. The inline comment claims "SLICE-189 is expected to invert
this assertion," but that's only true if SLICE-189 either (a) broadens AC-1
beyond "any file changed" to something path-aware (e.g. excluding
docs-only/non-code paths when no `touches_files` is declared), or (b) this
fixture is amended to declare `touches_files` pointing at real
implementation paths so AC-2 has something to compare against. Neither is
SLICE-188's job to resolve — it's a genuine ambiguity in FEAT-284's AC text
that the SLICE-189 builder needs to notice and either resolve via a broader
rule or flag back. Flagging now so it isn't a surprise mid-SLICE-189.

The empty-commit fixture and the `touches_files` pair are both cleanly
provable as described; only the docs-only fixture has this gap.

## 4. Characterization-test hygiene — PASS

Both "KNOWN DEFECT (FEAT-284)" tests are unambiguously labeled in the test
name, have an inline comment stating they characterize current (broken)
behavior and that SLICE-189 is expected to invert them, and their
`assert.deepEqual` failure messages repeat "KNOWN DEFECT ... see
FEAT-284/SLICE-189." They assert concrete values (`shipped.map(ordinal) ===
[1]`) rather than something vacuous — when SLICE-189 changes the matcher to
exclude these shapes, `shipped` will become `[]` and the assertion will fail
loudly (not silently pass), forcing SLICE-189 to consciously flip the
expected value. Same pattern for the `touches_files` no-overlap fixture's
message. Good discipline.

## 5. Repo conventions — PASS

ESM-only, no new imports added (reuses existing `fs`/`path`/`os`/
`spawnSync`). Ran independently:

```
bunx tsc --project tsconfig.test.json --noEmit   → clean
bunx biome lint src/tests/git-anchored-completion.test.mts   → 1 file, no issues
bunx biome format src/tests/git-anchored-completion.test.mts → 1 file, no issues
bun ./src/scripts/validate-content-length.mts     → OK (test files aren't in scope of that gate)
```

`commitFixture`'s branching is trivial (single if/else), well under the
complexity cap.

## Independent verification

- `bun test src/tests/git-anchored-completion.test.mts` → **19 pass / 0 fail**
  (matches the builder's report).
- `bun run typecheck` (both tsconfig + tsconfig.test) → clean.

## On the reported `capture-at-close-hook.test.mts` flake

Verified independently, not just accepted:

- The commit touches nothing in `capture-at-close-hook.test.mts` or its
  source (`git diff --name-only` confirms only the git-anchored test file
  changed).
- `bun test src/tests/capture-at-close-hook.test.mts` in isolation:
  **12 pass / 0 fail**, run twice.
- `bun test src/tests/ --parallel --timeout 60000` (full suite) run 4 times
  back-to-back: **1 fail / 3 pass**, and the one failure (captured in a saved
  log) was specifically
  `capture-at-close.mjs — event/transcript field resolution > SubagentStop
  reads agent_transcript_path and passes --event subagent_stop`.

This corroborates the builder's characterization: it's a genuine
intermittent parallel-run flake in a file this slice never touched, not
something introduced by SLICE-188. **I agree with that call.**

## Decision: approved_with_notes

SLICE-188 does its stated job — fixtures only, no matcher change, backward
compatible, clean lint/typecheck, characterization tests correctly pinned.
One note carried forward for SLICE-189: the docs-only "KNOWN DEFECT" fixture
(git-anchored-completion.test.mts:263-282) isn't cleanly invertible under a
literal reading of FEAT-284's AC-1 + AC-2 alone, because it declares no
`touches_files`. SLICE-189's implementer should resolve this by either
broadening the file-changed rule for undeclared-`touches_files` slices, or
by revisiting the fixture to declare `touches_files` before treating the
inversion as complete. Not a blocker for SLICE-188's close.
