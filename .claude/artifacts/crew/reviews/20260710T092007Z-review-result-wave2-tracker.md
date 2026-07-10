---
run: wave2-tracker
branch: feat/tracker-program-prep
reviewer: crew:reviewer (ad hoc dispatch)
decision: approved
---

# Review — wave 2 tracker-provider migration (SLICE-152 / SLICE-155)

## Scope reviewed

`git diff origin/main...HEAD` on `feat/tracker-program-prep`, source + tests only
(ceremony artifacts under `.claude/artifacts/**` and `loop-snapshot.md` excluded
per reviewer brief):

- `src/scripts/lib/backlog-store.mts`
- `src/scripts/lib/slice-linker/complete-slice.mts`
- `src/scripts/lib/slice-linker/feature-lifecycle.mts`
- `src/scripts/lib/task-store/providers/github-provider.mts`
- `src/scripts/lib/wave/failure-pivot.mts`
- `src/scripts/loop.mts`
- `src/tests/backlog-store-slices.test.mts`, `src/tests/task-store-provider-routing.test.mts`,
  `src/tests/wave/failure-pivot.test.mts`

## Verdict: PASS

No blocking correctness bugs or dropped behavior found. Independently reproduced the
evidence: `bunx tsc --project tsconfig.json --noEmit` and `--project tsconfig.test.json`
clean; `bun test src/tests/ --parallel --timeout 60000` → 2611 pass / 0 fail / 1 skip;
`bunx biome lint` on the six changed source files shows only pre-existing
`useOptionalChain` warnings outside the touched line ranges (legacy baseline per
CLAUDE.md, not introduced by this diff).

## Findings

- **[INFO]** `src/scripts/lib/slice-linker/feature-lifecycle.mts` lost ~280 lines but
  nothing was dropped — `extractAcceptanceCriteria`, `AcceptanceCriteriaRequiredError`,
  `assertAcceptanceCriteria`, `maxSliceIdUnder`, `buildSliceContent` and the two
  materialize helpers' inline id/path/write logic all moved verbatim into
  `backlog-store.mts`'s `createSlice` + helpers, confirmed line-by-line against the diff.
  `feature-lifecycle.mts` re-exports the three AC helpers so no external import path
  changes (verified: no other file imports these three names from `backlog-store.mjs`
  directly today).
- **[INFO]** `materializeProposedSlices`'s multi-slice loop changed from precomputing
  all N ids up front (`maxId + 1 + i`) to a sequential `for...of` that calls
  `createSlice` (which re-scans disk for the max on every call) once per proposed
  slice. Correct as written — each iteration is awaited before the next starts, so the
  previous slice's file is on disk before the next id is allocated — but it is a
  latent race if this loop is ever changed to run concurrently (e.g. `Promise.all`).
  Not a current bug; flagging so a future refactor doesn't silently reintroduce
  duplicate slice ids. Confirmed live-fire: FEAT-252's `proposed_slices` (3 entries)
  materialized as SLICE-156/157/158 with no collisions in the backlog state included
  in this diff.
- **[INFO]** `complete-slice.mts`'s `moveAndStampSlice`: verified `status: "completed"`
  is still set unconditionally in both branches — the "move" branch gets it via
  `moveSlice`'s `toState` param, the "already in place" branch passes it explicitly to
  `updateSliceFrontmatter`. Original code set it unconditionally too (outside the
  if/else). Behavior preserved.
- **[INFO]** `wave/failure-pivot.mts`: `persistPivotAt` becomes `async`
  (`Promise<string>`) instead of sync. All current call sites are tests, which already
  `await` it; grep confirms no production caller exists yet. The file's own comment
  correctly self-flags a real behavior change for whoever wires this in later: the old
  `moveToNeedsReview` only moved a slice out of a directory literally named `pending`,
  while the new `moveSlice` moves unconditionally from whatever directory it's in. Not
  exploitable today (dormant code path) but worth carrying into SLICE-156/wave-runner
  wiring as an explicit guard, not assuming `moveSlice`'s current unconditional-move
  semantics are safe for that call site as-is.
- **[INFO]** `github-provider.mts`'s `_enabledConfig()` override (forcing
  `github.enabled: true` before calling into `github-sync.mjs`'s own functions) is
  necessary and correctly scoped: `getProvider()` already decided this call should
  reach `GithubProvider` (via `taskStore.provider: "github"` OR the `github.enabled`
  back-compat branch), so re-checking `config.github.enabled` inside `github-sync.mjs`
  would double-gate and silently no-op when only `taskStore.provider` was set. Covered
  by AC-5's explicit-provider-vs-back-compat-equivalence test.
- **[INFO]** `loop.mts`'s AC-4 claim (zero direct `importGithubSync(...)` call sites)
  independently reproduced via grep — zero matches.
- **[INFO]** `importGithubSyncModule`'s new third candidate path
  (`<repoRoot>/scripts/lib/github-sync.mjs` as a sibling of the `github-sync/`
  folder, not inside it) is a real pre-existing resolution bug fix, called out
  honestly in the diff's own comment as previously masked by every existing test's
  mocked `ghExec` short-circuiting before this path was reached.

## Test adequacy

`backlog-store-slices.test.mts` covers `createSlice`, `updateSliceFrontmatter`,
`moveSlice`, `listByState`/`getById(kind:"slice")`, and the failure-pivot
regex-to-mergeFrontmatter port (including the "second failure doesn't duplicate
last_failure sub-fields" regression case — confirmed relevant given `mergeFrontmatter`
does a shallow `{...frontmatter, ...updates}` merge, so a whole-object `last_failure`
replacement is correct, not an accidental deep-merge hazard).

`task-store-provider-routing.test.mts` covers AC-1 through AC-5 from the FEAT-251
contract: github back-compat publish + idempotency, noop zero-gh-calls, unconfigured-repo
silent resolution, zero direct-import call sites, and explicit-provider/back-compat
output equivalence. This is solid coverage of the fallback matrix a provider-seam
migration needs.

## Non-blocking notes for follow-up (not required before merge)

1. Carry the `persistPivotAt`/`moveSlice` unconditional-move gap into whichever slice
   wires `persistPivotAt` into the live wave runner — add a source-state check before
   relying on it in production.
2. The sequential-id-allocation dependency in `materializeProposedSlices` (comment
   already flags this) should stay a `for...of`, not be "optimized" to parallel later
   without re-adding explicit id reservation.

No other issues found. Recommend merge.
