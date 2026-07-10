---
review_id: 20260710T151153Z-review-result-qw6-slice-start
branch: fix/qw6
commit: 75e52212
reviewer: crew:reviewer (read-only)
decision: approved
---

# Review — fix(slice-start): honor frontmatter touches_files over empty reclassification

## Scope

`git diff origin/main...HEAD` (75e52212), worktree `C:/work/mega/runner-plugin-worktrees/qw6`.

- `src/scripts/lib/slice-linker/start-slice.mts` (+34/-3)
- `src/tests/slice-start.test.mts` (+25, additions only)

## Verification performed

1. **Existing assertions unmodified** — confirmed via diff: the test file diff is
   additions-only (one new import line + one new test). No existing test body changed.
2. **Precedence guard** (`normalizeDeclaredTouchesFiles`) — read by inspection:
   - `touches_files: []` → `Array.isArray` true, `filter` yields `[]`, `paths.length > 0 ? paths : null`
     → returns `null` → falls back to `parseSliceFiles` body scan. Correct.
   - non-array garbage (string, `null`, object) → `Array.isArray` guard fails first → returns `null`,
     no throw. Correct.
   - **Gap**: neither case has a dedicated test. Only the happy-path (non-empty declared array wins)
     is covered by the new test. Logic is sound but unverified by the suite — worth a follow-up test,
     not a blocker.
3. **Zero-delta `FileChange` mapping** — checked whether zeroing `added/removed/exportDelta` for
   declared-frontmatter files changes shape classification vs. the body-parse path. It does not:
   the pre-existing `parseSliceFiles` fallback (line 58, unchanged by this diff) already zeroes all
   three fields for every body-parsed file — so both paths were already using the same zero-delta
   convention before this change. `src/scripts/lib/wave/planner.mts:24-33` independently confirms this
   is an accepted repo-wide pattern (`shapeForPaths`, same zero-delta shape with an explicit comment
   on the LOC-gate under-count tradeoff). No new single-module-edit vs. none skew introduced.
4. **Wave planner consumption** — `src/scripts/lib/wave/touches-files.mts::readTouchesFiles` (used by
   `packWave` in `planner.mts`) parses slice frontmatter **independently**, with its own
   `parseFrontmatter`/`Array.isArray(declared) && declared.length > 0` check. It was already reading
   `touches_files` from frontmatter correctly and does **not** consume `start-slice.mts`'s
   `applyShapeClassification` output or the shape-marker file at all. The shape marker
   (`shape-marker.mts::ShapeMarker`) only stores `{ shape, rationale, inlinePath, ts }` — no
   `touchesFiles` field — and its sole reader (`grade-telemetry.mts`) doesn't use paths either.
   **Finding**: the new code comment's stated motivation ("silently starve the wave planner's
   conflict-packing input") is inaccurate — wave-mode conflict packing was never broken by the bug
   this PR fixes. The actual fixed consumer is the CLI/orchestrator-facing `touchesFiles` field
   returned by `startSlice` (documented in `commands/start.md`), used for display/audit, not
   wave packing. The fix itself is still correct and worth keeping; only the justification is
   misattributed. Non-blocking.
5. **Evidence reruns**:
   - `bun test src/tests/slice-start.test.mts` → 19 pass, 0 fail.
   - `bun test src/tests/ --parallel --timeout 60000` → 2660 pass, 1 skip, 0 fail, 279 files (matches
     claimed evidence).
   - `bunx tsc --project tsconfig.json --noEmit` → clean.
   - `bunx tsc --project tsconfig.test.json --noEmit` → clean.
   - `bunx biome format` on both touched files → clean.
   - `bunx biome lint` on touched files → 1 warning, `noExcessiveCognitiveComplexity` (23 vs cap 15)
     on `startSlice` at line 470. Confirmed **pre-existing**: diffed the pre-fix (`origin/main`)
     version of the same function in isolation and it already reports complexity 23. Not a
     regression introduced by this diff; part of the legacy baseline CLAUDE.md already tracks
     ("Track if complexity grows past 20" — already past it, unrelated to this change).

## Additional observations (non-blocking)

- `commands/start.md:64-66` is now stale — it still documents `touchesFiles` as populated solely
  from the `## Files` body section. Should be updated to describe the frontmatter-first,
  body-fallback precedence this PR introduces, and to correct the "wave planner" framing per
  finding 4 above.
- Doc comment at `start-slice.mts` around `applyShapeClassification` repeats the same wave-planner
  misattribution as the commit message — consider tightening to "the CLI-facing touchesFiles
  contract" instead of "the wave planner's conflict-packing input" in a follow-up.

## Findings summary

| Severity | Location | Issue |
|---|---|---|
| MINOR | `src/tests/slice-start.test.mts` | No test for empty-array or non-array `touches_files` fallback path (guard verified correct by inspection only). |
| MINOR | `commands/start.md:64-66` | Doc contract text not updated for new frontmatter-first precedence; also inherits the wave-planner misattribution. |
| INFO | `start-slice.mts:95-98` (comment) / commit message | Wave-mode conflict packing already read frontmatter `touches_files` independently via `wave/touches-files.mts`; it was not the broken consumer. Fix's actual value is the CLI-facing `touchesFiles` contract, not wave packing. |

No correctness bugs found. No regressions in existing tests or typecheck. Fix is behaviorally sound
and matches an already-accepted repo convention (zero-delta `FileChange` for pre-implementation
declared paths).

## Decision: **approved**
