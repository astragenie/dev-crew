# Review result — SLICE-181 (FEAT-276 AC-4)

**Decision: PASS**

- Reviewer: independent review (crew:reviewer role), dispatched by team lead
- Commit reviewed: `44e2f78b` on branch `worktree-agent-a83c9d39537e13577`
  (worktree: `.claude/worktrees/agent-a83c9d39537e13577`, parent `b0c4f473`)
- Scope: declare `touches_files` at slice-creation time in `buildSliceMarkdown`
  (the single writer behind both `sliceFromFeature` materialization paths)

## Note on missing backlog artifacts

FEAT-276.md and the SLICE-181 file are absent from the worktree (never
committed to the main tree — a lead-side gap, not a builder failure). This
review is based entirely on the code diff, its tests, and the dispatch
prompt's restated requirements, per the team lead's instruction.

## Summary of the change

7 files, +316/-26, all inside declared scope:

- `src/scripts/lib/proposed-slices.mts` — new optional `ProposedSlice.touches_files`,
  shape-validated (non-empty array of non-empty strings, repo-relative).
- `src/scripts/lib/slice-linker/feature-lifecycle.mts` — `materializeSingleSlice`
  propagates FEAT-level `touches_files` 1:1; `materializeProposedSlices` threads
  each entry's own `touches_files` to that slice only (no FEAT-level fallback).
- `src/scripts/lib/backlog-store/slice-store.mts` — `buildSliceMarkdown`/`createSlice`
  accept a pre-resolved `touchesFiles` and write it only when non-empty.
- `agents/pm.md` — documents the conservative bar for PM-populated `touches_files`.
- Three test files add coverage for the new field and both materialization paths.

## Findings (severity order)

**No blocking findings.** All gates independently re-run and confirmed green
(see Verification below). Two low-severity notes for awareness, neither
blocking:

1. **[LOW] Windows UNC-path gap in the fast validator, backstopped by CI.**
   `src/scripts/lib/proposed-slices.mts:198` (`resolveTouchesFiles`) rejects
   absolute paths via `p.startsWith("/")` and `/^[A-Za-z]:[\\/]/` (drive-letter
   forms), plus `..` traversal — this correctly catches `/etc/passwd`,
   `C:\foo`, and `C:/foo`. It does **not** catch a Windows UNC path like
   `\\server\share\file.mts`, which matches neither pattern and would pass
   shape validation. Same gap applies to `materializeSingleSlice`'s
   `normalizeFeatureTouchesFiles` (`feature-lifecycle.mts:63`), which does no
   path-safety check at all on FEAT-level `touches_files` — it only filters
   non-empty strings.
   However, this is fully backstopped: `validate-slice-touches-files.mts:39`
   (CI gate #11) uses Node's platform-aware `path.isAbsolute()`, which
   correctly flags UNC paths as absolute on win32, and it runs uniformly
   against every materialized slice file regardless of which writer declared
   the paths (confirmed by reading `checkPath()` at
   `src/scripts/validate-slice-touches-files.mts:39-47`). So no wrong path can
   silently reach the wave planner — it would fail CI before merge. The
   in-repo comment's claim that "fails fast at PM-apply time" is slightly
   overstated for this one edge case; worth a one-line follow-up if anyone
   revisits this file, not a blocker.

2. **[LOW] No dedicated test for a Windows-style absolute or UNC path.**
   `src/tests/proposed-slices.test.mts`'s new tests cover "not an array",
   "empty array", `/etc/passwd`, and `../outside/file.mts`, but not
   `C:\foo\bar.mts` or `\\server\share\file.mts` — notable since this repo
   runs on win32. Given finding #1's CI backstop, this is a coverage gap, not
   a correctness gap.

3. **Follow-up hole confirmed, not a defect.** Builder's claim that
   `crew:architect-feature` (the other FEAT-level `touches_files` writer,
   per CLAUDE.md's "Hard dependency" on the `crew`/`dev-team` plugin) is
   outside this repo and thus uncovered is verified: `grep -rln
   "touches_files" agents/ commands/` in this repo returns only `agents/pm.md`,
   `commands/start.md`, `commands/wave.md` — no `architect-feature` prompt
   exists here to edit. This is a real, material gap for FEAT-level
   `touches_files` provenance (architect-feature FEATs get no declared value
   at all today), but it's genuinely out of this repo's write scope. Worth a
   short entry under `docs/upstream-requests/` rather than blocking this slice.

## Question-by-question assessment

1. **Asymmetry (no FEAT-level fallback for multi-slice, 1:1 for single-slice):
   correct, and verified no hidden multi-slice path exists in the 1:1 branch.**
   `feature-lifecycle.mts:283` dispatches to `materializeProposedSlices` only
   when `proposed && proposed.length > 0`; `materializeSingleSlice` (line 297)
   is the sole fallback, called only when there is no `proposed_slices` array.
   So the "lone slice IS the whole FEAT" premise holds by construction — there
   is no path where `materializeSingleSlice` runs against a FEAT that actually
   decomposes into multiple slices.

2. **Correctness direction: appropriately biased toward under-declaring over
   over-declaring, and the validation mostly delivers on that** — see finding
   #1 for the one platform-specific gap, fully backstopped by CI gate #11.

3. **Idempotency / non-clobbering: verified.** `slice-store.mts`'s
   `applyOptionalFrontmatterFields` only sets `frontmatter.touches_files` when
   `Array.isArray(touchesFiles) && touchesFiles.length > 0`. `readTouchesFiles`
   in `wave/touches-files.mts:56` independently requires
   `Array.isArray(declared) && declared.length > 0` for `confidence:
   "declared"` — an empty array from either side falls through to
   inferred/missing, exactly as claimed. Confirmed by the new test "omits
   touches_files frontmatter when the caller resolves nothing"
   (`backlog-store-slices.test.mts`).

4. **Scope discipline: confirmed clean.** `git diff --stat` against
   `wave/planner.mts`, `wave/planner.test.mts`, `wave/touches-files.mts`
   returns nothing — all three are untouched by this commit.

5. **`agents/pm.md`: accurate and within cap.** The file is 333 lines, under
   its file-specific override of 335 in
   `validate-content-length.mts:AGENT_LINE_OVERRIDES` (pre-existing override,
   not introduced by this slice — it was already 331 lines at the parent
   commit). The added guidance ("set it ONLY when you already know, from
   files you actually read this session... a wrong path is worse than none...
   omit entirely when unsure") matches the conservative bar the code
   enforces. Margin to the cap is now only 2 lines — no action needed now,
   but the next edit to this file will need to bump the override or trim.

6. **Test adequacy: good, one gap noted (finding #2).** Coverage spans shape
   validation (non-array, empty array, absolute POSIX path, `..` traversal),
   the no-leak-to-sibling case, and the single-slice 1:1 propagation case —
   all independently re-run and passing.

## Verification performed (independent, not just re-trusting the builder)

- `bun test src/tests/proposed-slices.test.mts src/tests/backlog-store-slices.test.mts src/tests/slice-from-feature-proposed-slices.test.mts`
  → **65 pass / 0 fail**
- `bunx tsc --project tsconfig.json --noEmit` → clean
- `bunx tsc --project tsconfig.test.json --noEmit` → clean
- `bunx biome lint` on the three changed source files → **0 errors/warnings**
  (6 infos, all "unsafe fix: use literal key" style suggestions, not failures)
- `bunx biome format --check` on all 6 changed source/test files → clean
- `bun ./src/scripts/validate-slice-touches-files.mts --repo .` → exit 0
  (1 pre-existing unrelated warning on a 2026-07-02 slice, 0 errors)
- `bun ./src/scripts/validate-content-length.mts` → OK
- `bun ./src/scripts/validate-manifests.mts` → OK
- `bun ./src/scripts/validate-imports.mts` → OK
- `bun ./src/scripts/validate-agent-refs.mts` → OK

All gates the builder reported were independently reproduced. Full suite
(3161 pass / 0 fail / 7 skip) was not re-run in full (time-bounded review) —
the targeted 65-test slice covering every changed file passed, which is the
relevant subset for this diff.

## Recommendation

**PASS.** Ship as-is. Two follow-ups worth a lightweight backlog note (not
blockers): (a) tighten `resolveTouchesFiles`'s absolute-path check to use
Node's `path.isAbsolute()` instead of a hand-rolled regex, closing the UNC-path
gap at the fast layer too (CI gate #11 already prevents any real damage); (b)
file an upstream request for `crew:architect-feature` to populate FEAT-level
`touches_files` when it already reads the relevant files, since that writer
is out of this repo's scope.
