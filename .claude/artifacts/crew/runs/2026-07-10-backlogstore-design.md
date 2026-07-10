# BacklogStore Design — FEAT-250 SLICE-1

Architect design artifact (runner:architect, 2026-07-10). Companion DEC:
`.claude/artifacts/loop/decisions/DEC-076.md`. Satisfies FEAT-250's
`needs_contract: true` pre-flight — this program's contract is a TypeScript
module interface, not an OpenAPI surface, so the design lives here rather
than the `<feat>-contracts.openapi.yaml` convention.

## 1. BacklogStore interface

**Module location**: new `src/scripts/lib/backlog-store.mts`. `backlog-writer.mts` (`src/scripts/lib/backlog-writer.mts`) keeps every existing exported name and signature unchanged, but each function body becomes a one-line delegate to `backlog-store.mts`. This is the cheapest possible path to AC-1's byte-identical parity: the safest way to guarantee zero output drift across the 11 callers (confirmed by grep — `arch-gate.mts`, `claims-sync.mts`, `grade-writer.mts`, `intake.mts`, `pm-apply.mts`, `slice-linker/close-slice.mts`, `slice-linker/complete-slice.mts`, `slice-linker/feature-lifecycle.mts`, `slice-linker/start-slice.mts`, `spec-decomposer.mts`, `loop.mts`) is to **move the existing function bodies verbatim** into `backlog-store.mts` and have `backlog-writer.mts` re-export/delegate, rather than rewrite the logic. All 11 callers today import only `findFeatureById`, `updateFeatureFrontmatter`, `moveFeature`, `addFeature` from `backlog-writer.mjs` — none reach into raw `fs`. No caller file needs to change at all.

Async, matching the existing `fs/promises` convention.

```ts
// src/scripts/lib/backlog-store.mts

export async function createFeature(
  repoPath: string,
  options: {
    title?: string;
    body?: string;
    priority?: string | null;
    category?: string | null;
    target_release?: string | null;
    derived_from?: string | string[] | null;
    github_issue?: number | null;
    github_url?: string | null;
    config?: Record<string, unknown> | null;
  }
): Promise<{ id: string; filePath: string; frontmatter: Record<string, unknown> }>;
// = current addFeature body (backlog-writer.mts:84-142), moved verbatim.
// backlog-writer.mts's `addFeature` becomes:
//   export const addFeature = createFeature;
// (re-export, not a wrapper call — zero indirection overhead, zero behavior risk)

export async function updateFeatureFrontmatter(
  filePath: string,
  updates: Record<string, unknown>,
  repoPath?: string,
  config?: Record<string, unknown> | null
): Promise<Record<string, unknown>>;
// = current body, backlog-writer.mts:144-163, moved verbatim.

export async function moveFeature(
  filePath: string,
  toState: string,
  updates?: Record<string, unknown>,
  repoPath?: string,
  config?: Record<string, unknown> | null
): Promise<{ from: string; to: string }>;
// = current body, backlog-writer.mts:165-228 INCLUDING the DORA A2
// emitBacklogStateChanged call at line 219 and doraFieldsFromFrontmatter
// at line 238-245 — moved as one unit, untouched. See AC-2 discussion below.

export async function createSlice(opts: {
  repoPath: string;
  featureId: string;
  featureFilePath: string;
  featureFrontmatter: Record<string, unknown>;
  featureBody: string;
  effortPoints?: number;
  config?: Record<string, unknown> | null;
}): Promise<{ id: string; filePath: string; title: string }>;
// NEW. Subsumes buildSliceContent + fs.writeFile currently inlined in
// feature-lifecycle.mts:474-481 (materializeSingleSlice) and the
// equivalent loop at feature-lifecycle.mts:~575-585 (materializeProposedSlices).

export async function updateSliceFrontmatter(
  filePath: string,
  updates: Record<string, unknown>,
  repoPath?: string,
  config?: Record<string, unknown> | null
): Promise<Record<string, unknown>>;
// NEW. Same shape as updateFeatureFrontmatter but rooted at slicesRoot().
// feature-lifecycle.mts:493-495's updateFeatureFrontmatter(featureFilePath,
// { slices: [...] }) call stays as-is (that's a FEATURE write, unaffected)
// — this new function is for writes TO the slice file itself.

export async function moveSlice(
  filePath: string,
  toState: string,
  updates?: Record<string, unknown>,
  repoPath?: string,
  config?: Record<string, unknown> | null
): Promise<{ from: string; to: string }>;
// NEW. Subsumes moveAndStampSlice (complete-slice.mts:44-72) and
// moveToNeedsReview + the frontmatter mutation currently done by
// failure-pivot.mts's persistPivotAt (see §3).

export async function listByState(
  repoPath: string,
  kind: "feature" | "slice",
  state: string,
  config?: Record<string, unknown> | null
): Promise<Array<Record<string, unknown>>>;
// NEW. For kind:"feature", = filterBacklog(await listBacklog(repoPath,
// {config}), { status: state }) — backlog-parser.mts:72-85 + :111-124,
// reused not reimplemented. For kind:"slice", parallel readdir under
// slicesRoot(repoPath, config)/<state>/ (no existing shared slice-listing
// helper — this is genuinely new, mirroring readStateEntries's shape,
// backlog-parser.mts:56-70).

export async function getById(
  repoPath: string,
  kind: "feature" | "slice",
  id: string,
  config?: Record<string, unknown> | null
): Promise<Record<string, unknown> | null>;
// For kind:"feature" = current findFeatureById (backlog-writer.mts:267-274),
// moved verbatim; backlog-writer.mts re-exports as
//   export const findFeatureById = (repoPath, featureId, config) =>
//     getById(repoPath, "feature", featureId, config);
// For kind:"slice", NEW — scans all slice state dirs for an id match
// (no equivalent exists today; slice lookups are currently done ad hoc by
// each of the 3 write sites via direct path construction, not a lookup fn).
```

**Preserving DORA A2 untouched (AC-2)**: the emission block is not refactored, restructured, or re-parameterized — it is relocated as-is inside `moveFeature`'s new home. `emitBacklogStateChanged` (imported from `backlog-state-emitter.mjs`) keeps being called with the identical four-field envelope built by `doraFieldsFromFrontmatter`. Because the FEAT-247 integration test asserts against `moveFeature`'s behavior (not its file location), and `backlog-writer.mts`'s `moveFeature` becomes a straight re-export (not a wrapper that re-derives arguments), the test requires zero edits — it imports `moveFeature` from wherever it does today and gets the same function object transitively.

Side-effect plumbing that must move with the functions, not be reimplemented: `bust()`/`clearAll()` (`cache.mts`), `clearFrontmatterCache()` (`frontmatter-cache.mts`), `assertStatePath()` (`state-paths.mts`), `validateFeat()` (`state-schemas.mts`). These are called inline in the current bodies and are part of what "byte-identical output for the same input" depends on — moving the function without moving its cache-invalidation calls would be an observable behavior change (stale reads), not a refactor.

## 2. Slice-side construction plan (AC-3)

Three write sites map onto the new methods:

| Site | Current behavior | Maps to |
|---|---|---|
| `slice-linker/complete-slice.mts:44-72` `moveAndStampSlice` | `mergeFrontmatter` + `fs.writeFile` + conditional `fs.unlink` between `pending/active/in-progress` → `completed/` | `moveSlice(sliceFile, "completed", { completed_at, updated })` |
| `slice-linker/feature-lifecycle.mts:474-481` (materializeSingleSlice) | `buildSliceContent()` + `fs.writeFile` under `pending/` | `createSlice({...})` — `buildSliceContent`'s logic moves into `backlog-store.mts` as a private helper |
| `slice-linker/feature-lifecycle.mts:~575-585` (materializeProposedSlices loop) | Same `buildSliceContent` + `fs.writeFile`, looped per proposed slice | `createSlice({...})` called once per item, same as single-slice path — one code path instead of two near-duplicate ones |
| `wave/failure-pivot.mts:91-99` `moveToNeedsReview` (called from `persistPivotAt`, only on the `escalating` branch) | `renameSync` from `.../pending/` to `.../needs-review/` | `moveSlice(slicePath, "needs-review", {...})` — see §3 for how the frontmatter half of `persistPivotAt` maps |

`createSlice` consolidating both `feature-lifecycle.mts` call sites removes an existing near-duplication (single-slice and multi-slice construction currently each inline their own `buildSliceContent` + `ensureDir` + `fs.writeFile` sequence) — an incidental cleanup, not just a mechanical move.

## 3. failure-pivot regex decision (AC-4): **port to mergeFrontmatter**

Read `wave/failure-pivot.mts:60-125`. The hand-rolled regex (`FRONTMATTER_RE`, `upsertFrontmatterField`, `removeFrontmatterField`, `setLastFailureBlock`) does four things: set `status`/`wave_attempts`/`pending_fix` scalar fields, remove `pending_fix` on escalation, and write a nested `last_failure:` block with 4 sub-keys (`wave_id`, `kind`, `artifact`, `pivot_command`).

Checked `frontmatter.mts:268-296` (`isPlainMapping`, `serializeFrontmatter`'s per-key branch): the shared parser **already natively supports exactly this shape** — a top-level key whose value is a plain nested mapping serializes as `key:\n  innerKey: innerVal` (frontmatter.mts:305-309), which is byte-for-byte the same layout `setLastFailureBlock` hand-builds today. This isn't a case where the shared parser lacks a feature the regex approach was invented to work around — the regex predates or duplicates support that already exists. **Recommendation: port.** `persistPivotAt` becomes:

```ts
const updates: Record<string, unknown> = {
  wave_attempts: pivot.retryCount,
  last_failure: {
    wave_id: pivot.originalWaveId,
    kind: pivot.failureKind,
    artifact: pivot.failureArtifactPath,
    pivot_command: pivot.fixCommand
  }
};
if (escalating) {
  updates.status = "needs-review";
  updates.pending_fix = null; // deletion convention — see risk below
} else {
  updates.pending_fix = "true";
}
await updateSliceFrontmatter(slicePath, updates, ...);
if (escalating) return await moveSlice(slicePath, "needs-review", {}, ...);
return slicePath;
```

**One real risk to flag, not paper over**: `mergeFrontmatter` (`frontmatter.mts:318-322`) does `{...frontmatter, ...updates}` — a shallow merge that can only *set* keys, never *delete* one (`removeFrontmatterField`'s current job). `updateFeatureFrontmatter`/`updateSliceFrontmatter` have no delete primitive today. The port needs either (a) a documented convention that `pending_fix: null` is written and treated as absent by every reader of that field (grep confirms `pending_fix` is only read by `failure-pivot.mts` and its wave-runner caller, so this is a contained, verifiable change), or (b) `backlog-store.mts` grows a small `deleteKeys` option on `mergeFrontmatter`/`updateSliceFrontmatter`. Recommend (a) — smaller surface, and the DEC records it as the resolution, with a grep-verified reader list as the regression-test evidence AC-4 requires (path (a): "port with regression test proving identical *parsed* output on the escalating and non-escalating branches," not byte-identical, since `serializeFrontmatter` reformats untouched fields — e.g. an inline-array vs. block-array field elsewhere in the same frontmatter block would be normalized to inline-bracket form on any full-file round-trip through `parseFrontmatter`/`serializeFrontmatter`, per `serializeScalar` at frontmatter.mts:242-245 always emitting `[a, b]` style regardless of source formatting). That reformatting is a semantics-preserving normalization, not a correctness risk, but it does mean AC-4's "identical output" for path (a) has to be scoped to "identical parsed structure," distinct from AC-1's stricter byte-identical bar for feature callers.

## 4. doctor.mts classification (AC-5 / COND-D): **named allowlist exception, not migrated**

Read `doctor.mts:139-238` (`applyFix`). Its writes are structurally incompatible with BacklogStore's lifecycle-transition model, for three concrete reasons, not just COND-D's a-priori framing:

1. **Cross-root operation.** `applyFix` reads from `LEGACY_ROOTS` (`doctor.mts:28`, `docs/backlog` and `.claude/artifacts/loop/backlog` as alternates) and reconciles *into* the authoritative root. BacklogStore has no concept of a non-authoritative source root — every method takes one `repoPath`/`config` pair that resolves to one root via `backlogRoot()`/`slicesRoot()`. Doctor's whole job is repairing exactly the kind of divergence (two roots, same id, different state) that BacklogStore's single-root model assumes can't happen.
2. **Content-preserving, not frontmatter-merging, moves.** `applyFix`'s `fs.rename` (doctor.mts:187, 205) and conflict-archive `fs.writeFile` (doctor.mts:201, 218) intentionally move/copy files **byte-for-byte**, with no `mergeFrontmatter` call anywhere in the function. This is correct for its purpose — conflict resolution must preserve the loser's exact historical content in the `conflicts/` archive for manual inspection, and the winner's rename must not silently touch its `updated`/timestamp fields the way a lifecycle-transition write legitimately would. Forcing this through `moveFeature`/`moveSlice` would inject frontmatter mutation doctor deliberately avoids.
3. **Report writes land outside backlog paths.** The `reportPath` (doctor.mts:155, under `artifactRoot(repoPath, config)/doctor/`) and `conflicts/` archive are not under `backlogRoot()`/`slicesRoot()` at all — only the `fs.rename`/`fs.unlink` calls touch backlog-proper paths. A guard scoped to `.claude/artifacts/loop/backlog/**` (per AC-5) doesn't even reach the report/archive writes; only the rename/unlink calls need an exception entry.

**Recommendation**: allowlist `doctor.mts` by name in the CI guard (§5), with the one-line rationale "cross-tree reconciliation requires byte-preserving moves across roots BacklogStore doesn't model; see DEC-076." Do not attempt a BacklogStore `reconcile()` method in this program — that would be new scope beyond Phase 1's storage-seam mandate, better left as a follow-up if doctor's cross-root behavior is ever generalized.

## 5. CI allowlist guard design

New script `src/scripts/validate-backlog-writes.mts`, mirroring `validate-imports.mts`'s `BOUNDARIES` pattern (`validate-imports.mts:21-51`) but with a 2-condition trigger instead of `validate-imports`'s single blocked-import-pattern list, because "writes to a backlog path" can't be detected from an import pattern alone the way "imports a barrel's sub-module" can:

```ts
// src/scripts/validate-backlog-writes.mts
const RAW_FS_WRITE_RE = /\b(writeFile(Sync)?|rename(Sync)?|unlink(Sync)?|rm(dir)?(Sync)?|mkdir(Sync)?)\b/;
const BACKLOG_PATH_SIGNAL_RE =
  /backlogRoot\(|slicesRoot\(|from ["']\.\.?\/backlog-parser\.mjs["']|\.claude\/artifacts\/loop\/backlog/;

const ALLOWLIST = new Set([
  resolve("src/scripts/lib/backlog-store.mts"),          // the sole intended writer
  resolve("src/scripts/lib/doctor.mts"),                 // §4 — cross-tree reconciliation, byte-preserving moves
  // test fixture writers — enumerate explicitly, do not glob src/tests/**
  // wholesale (that would silently defeat the guard for any future test
  // that happens to write backlog fixtures without deliberate review)
  resolve("src/tests/helpers/backlog-fixtures.mts"),      // <- verify exact path at SLICE-4 time
]);
```

For every `.mts` under `src/scripts/`, if the file matches BOTH `RAW_FS_WRITE_RE` (imports/uses a raw fs write primitive — not a call through `backlog-store.mts`'s own exports) AND `BACKLOG_PATH_SIGNAL_RE` (references a backlog-rooted path or the parser it's built on), and the file is not in `ALLOWLIST`, fail CI with file:line. This is deliberately heuristic (text-pattern, not dataflow-verified) — same tradeoff `validate-imports.mts` already accepts for its import-boundary check — so it will need a companion **fixture test with a violating file** (per AC-5: "a new CI script test with a violating fixture (fails) and doctor.mts/test-fixture writers (pass)") to pin its behavior and catch false-negatives/positives as the allowlist evolves. `src/scripts/lib/backlog-writer.mts` itself, post-refactor, contains no raw `fs` calls at all (they all move to `backlog-store.mts`), so it needs no allowlist entry — its clean bill of health is itself evidence the refactor landed correctly.

**CLAUDE.md registration**: add as a numbered CI gate step (after the existing `validate-imports.mts` step) in the "CI gates" section, alongside a one-line description matching the existing gate-list style.

## 6. Risks + slice sequencing

The FEAT-250 4-slice decomposition holds; no amendment needed:

- **SLICE-1** (this slice, 3 pts): this design + DEC-076.
- **SLICE-2** (5 pts): feature-side delegate conversion. Low risk — confirmed all 11 callers already route through `backlog-writer.mjs`'s 4 exported functions only; the change is "move function bodies to a new file, re-export," not "rewrite 11 call sites."
- **SLICE-3** (5 pts): slice-side new construction. Higher risk than SLICE-2 — genuinely new code (`createSlice`/`updateSliceFrontmatter`/`moveSlice`), 3 call sites to migrate, plus the failure-pivot port's `pending_fix`-deletion convention (§3) needs its own regression test. SLICE-3 should land the `deleteKeys`-or-null convention decision explicitly in its own commit message / test comment.
- **SLICE-4** (3 pts): CI guard + CLAUDE.md + DORA parity test. Depends on SLICE-2 and SLICE-3 both landing first (the guard needs the real final file set to build its allowlist against, not a projected one).

**Cross-cutting risk not fully closed by this design**: the `pending_fix` key-deletion semantics (§3) is a judgment call this document makes but SLICE-3's builder should re-verify against the live `pending_fix` reader list at implementation time — a grep run today is a point-in-time fact, not a guarantee it stays the only reader through SLICE-3's landing.
