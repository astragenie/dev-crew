// slice-renumber.mts — FEAT-257 SLICE-B (DEC-079): residual slice-id
// collision remediation. SLICE-A's fetch-scan allocator narrows the window
// where two worktrees mint the same SLICE-NN id, but cannot fully close it
// (both sessions can still number before either pushes). When that residual
// race lands, this module turns the fix from a manual N-file sed (the real
// FEAT-244/FEAT-247 SLICE-147 incident needed 19) into one mechanical,
// reviewable CLI call: `bun loop.mts backlog slice-renumber --from SLICE-A
// --to SLICE-B`.
//
// renumberSlice:
//   1. Renames the losing slice's markdown file (state-dir aware, via
//      BacklogStore's renameSliceId — DEC-076 sole-writer invariant).
//   2. Renames every KIND_REGISTRY-surface artifact that references the old
//      id (slice-renumber-artifacts.mts — reuses buildArtifactSlug's own
//      tight-token logic, so a future 15th kind is covered automatically).
//   3. Renames the 3 bespoke-path families that bypass buildArtifactFilename
//      (trajectory JSONL, events JSONL, shape-marker JSON).
//   4. Rewrites the owning FEAT's `slices: [...]` frontmatter entry.
//   5. Appends (never mutates) a corrective event to the append-only
//      ledgers — learnings.jsonl (via logLearning) and the slice's own
//      events.jsonl (via appendSliceEvent, so the existing webhook fan-out
//      surfaces it too). grades.jsonl is deliberately NOT touched: its
//      GradeEventPayload requires a real `scores` map, and this repo already
//      guards against fabricated all-zero-score stubs landing in that ledger
//      (FEAT-258, writeGrade) — a renumber isn't a grade and forcing one in
//      would corrupt the "recent grade signal" averages that ledger feeds.
//   6. Does NOT touch git commit history — documented accepted residue.
//
// Refuses cleanly (SliceIdCollisionError) rather than clobbering when `toId`
// already exists — as either a slice file or any referencing artifact.
//
// Post-collision-check mid-operation failures (disk full, a Windows file
// lock, a permission error) do not roll back — full rollback was judged out
// of scope for a rare corrective tool — but they never fail silently either:
// renumberSlice re-throws as SliceRenumberPartialFailureError, which carries
// exactly what had already been renamed/appended before the failure, and
// logs that same partial-progress list via console.error before rethrowing,
// so an operator can finish or revert manually instead of being left with an
// undocumented half-renamed slice (worse than the collision this tool
// remediates).
//
// See .claude/artifacts/loop/decisions/DEC-079.md ("Renumber CLI") for the
// full design record.

import fs from "node:fs/promises";
import path from "node:path";

import { getById, renameSliceId, updateFeatureFrontmatter } from "./backlog-store.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import { logLearning, resolveCanonicalRepoRoot } from "./learnings.mjs";
import { appendSliceEvent } from "./slice-events.mjs";
import { locateSliceFile, slicesRoot } from "./paths.mjs";
import {
  anyArtifactReferencesSliceId,
  findBespokeFiles,
  findKindRegistryFiles
} from "./slice-renumber-artifacts.mjs";
import { TRAJECTORY_DIR } from "./trajectory-writer.mjs";
import { MARKER_DIR_PARTS } from "./shape-marker.mjs";

const SLICE_ID_FORMAT_RE = /^SLICE-\d+$/i;

// DI seam (mirrors jsonl-append.mts's `_internals` pattern) so tests can
// simulate a mid-operation rename failure (disk full, a Windows file lock)
// deterministically, without relying on a flaky real filesystem fault.
export const _internals = {
  renameFile: (from: string, to: string): Promise<void> => fs.rename(from, to)
};

export class SliceRenumberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SliceRenumberError";
  }
}

export class SliceIdCollisionError extends SliceRenumberError {
  constructor(public readonly toId: string) {
    super(
      `slice-renumber: --to ${toId} already exists (a slice file or an artifact ` +
        "already carries this id) — refusing to clobber. Pick an unused id."
    );
    this.name = "SliceIdCollisionError";
  }
}

export class SliceNotFoundError extends SliceRenumberError {
  constructor(public readonly fromId: string) {
    super(`slice-renumber: --from ${fromId} — no slice file found under slicesRoot.`);
    this.name = "SliceNotFoundError";
  }
}

/**
 * Thrown when a rename/append genuinely completed for part of the operation
 * before a later step failed (post-collision-check). Carries the exact
 * partial-progress lists — the same shape {@link renumberSlice} would have
 * returned on success — so the caller/operator can see precisely what
 * already changed on disk and finish or revert manually. No rollback is
 * attempted; see the module doc comment for why.
 */
export class SliceRenumberPartialFailureError extends SliceRenumberError {
  constructor(
    public readonly fromId: string,
    public readonly toId: string,
    public readonly renamed: string[],
    public readonly ledgerEvents: string[],
    public readonly underlyingError: unknown
  ) {
    super(
      `slice-renumber: ${fromId} -> ${toId} failed partway through ` +
        `(${renamed.length + ledgerEvents.length} step(s) already applied — see .renamed/.ledgerEvents ` +
        `on this error). Underlying error: ${underlyingError instanceof Error ? underlyingError.message : String(underlyingError)}`
    );
    this.name = "SliceRenumberPartialFailureError";
  }
}

function assertSliceIdFormat(id: string, flagName: string): void {
  if (!SLICE_ID_FORMAT_RE.test(id)) {
    throw new SliceRenumberError(
      `slice-renumber: --${flagName} "${id}" is not a valid slice id (expected SLICE-NN).`
    );
  }
}

function renumberScanDirs(repoPath: string, config: Record<string, any> | null) {
  const slicesRootDir = slicesRoot(repoPath, config);
  const artifactsRootDir = path.join(repoPath, ".claude", "artifacts");
  const trajDir = path.join(repoPath, TRAJECTORY_DIR);
  const shapeDir = path.join(repoPath, ...MARKER_DIR_PARTS);
  return {
    slicesRootDir,
    artifactsRootDir,
    trajDir,
    shapeDir,
    excludeDirs: [slicesRootDir, trajDir, shapeDir]
  };
}

async function sliceIdInUse(
  repoPath: string,
  sliceId: string,
  dirs: ReturnType<typeof renumberScanDirs>
): Promise<boolean> {
  if (await locateSliceFile(dirs.slicesRootDir, sliceId)) return true;
  if ((await findBespokeFiles(repoPath, sliceId)).length > 0) return true;
  return anyArtifactReferencesSliceId(dirs.artifactsRootDir, dirs.excludeDirs, sliceId);
}

function replaceSliceIdInList(existing: unknown, fromId: string, toId: string): string[] {
  const arr = Array.isArray(existing)
    ? existing.filter((x): x is string => typeof x === "string")
    : [];
  const replaced = arr.map((id) => (id === fromId ? toId : id));
  if (!replaced.includes(toId)) replaced.push(toId);
  return Array.from(new Set(replaced));
}

function relOf(repoPath: string, absPath: string): string {
  return path.relative(repoPath, absPath).split(path.sep).join("/");
}

export interface RenumberSliceOpts {
  /** List what would be renamed/appended without mutating anything. */
  dryRun?: boolean;
}

export interface RenumberSliceResult {
  renamed: string[];
  ledgerEvents: string[];
}

// Step 1 (BacklogStore-owned) + step 2/3 (artifact renames). Split out of
// renumberSlice to keep its cognitive complexity under the repo's cap.
// `renamed` is mutated in place (pushed to as each rename lands) rather than
// built locally and returned — so a mid-loop throw still leaves the caller's
// array holding everything that succeeded before the failure (HIGH finding,
// SLICE-B review).
async function renameSliceAndArtifacts(
  repoPath: string,
  fromId: string,
  toId: string,
  config: Record<string, any> | null,
  dirs: ReturnType<typeof renumberScanDirs>,
  dryRun: boolean,
  renamed: string[]
): Promise<string | null> {
  const sliceFilePath = await locateSliceFile(dirs.slicesRootDir, fromId);
  if (!sliceFilePath) throw new SliceNotFoundError(fromId);
  const { frontmatter } = parseFrontmatter(await fs.readFile(sliceFilePath, "utf8"));
  const featureId = typeof frontmatter.feature === "string" ? frontmatter.feature : null;

  if (dryRun) {
    renamed.push(`${relOf(repoPath, sliceFilePath)} (id: ${fromId} -> ${toId})`);
  } else {
    const { to } = await renameSliceId(sliceFilePath, toId, repoPath, config);
    renamed.push(`${relOf(repoPath, sliceFilePath)} -> ${relOf(repoPath, to)}`);
  }

  const kindFiles = await findKindRegistryFiles(
    dirs.artifactsRootDir,
    dirs.excludeDirs,
    fromId,
    toId
  );
  for (const { file, targetBasename } of kindFiles) {
    const target = path.join(path.dirname(file), targetBasename);
    if (!dryRun) await _internals.renameFile(file, target);
    renamed.push(`${relOf(repoPath, file)} -> ${relOf(repoPath, target)}`);
  }

  const bespokeFiles = await findBespokeFiles(repoPath, fromId);
  for (const file of bespokeFiles) {
    const target = path.join(path.dirname(file), path.basename(file).replace(fromId, toId));
    if (!dryRun) await _internals.renameFile(file, target);
    renamed.push(`${relOf(repoPath, file)} -> ${relOf(repoPath, target)}`);
  }

  return featureId;
}

// Step 4: owning FEAT frontmatter `slices: [...]` entry.
async function renumberFeatureSlicesEntry(
  repoPath: string,
  featureId: string | null,
  fromId: string,
  toId: string,
  config: Record<string, any> | null,
  dryRun: boolean
): Promise<string | null> {
  if (!featureId) return null;
  const featureEntry = await getById(repoPath, "feature", featureId, config);
  if (!featureEntry) return null;
  const updatedSlices = replaceSliceIdInList(featureEntry.frontmatter.slices, fromId, toId);
  if (!dryRun) {
    await updateFeatureFrontmatter(
      featureEntry.filePath,
      { slices: updatedSlices },
      repoPath,
      config
    );
  }
  return `${relOf(repoPath, featureEntry.filePath)} (frontmatter slices: ${fromId} -> ${toId})`;
}

// Step 5: append-only ledger corrective events — never mutate existing
// lines, and always route through the ledger's own sole-writer helper
// (logLearning / appendSliceEvent) rather than hand-rolling a JSONL line —
// a hand-rolled line skips schema validation (learnings) and the webhook
// fan-out (slice events) alike (MEDIUM finding, SLICE-B review). grades.jsonl
// is intentionally not touched — see the module doc comment.
async function appendLedgerEvents(
  repoPath: string,
  fromId: string,
  toId: string,
  featureId: string | null,
  dirs: ReturnType<typeof renumberScanDirs>,
  dryRun: boolean,
  ledgerEvents: string[]
): Promise<void> {
  const ts = new Date().toISOString();

  if (!dryRun) {
    await logLearning(repoPath, {
      key: "slice-renumber",
      insight: `Renumbered ${fromId} -> ${toId} (residual slice-id allocation-race remediation, DEC-079).`,
      sliceId: toId,
      source: "slice-renumber-cli",
      tags: [fromId, toId],
      confidence: 1
    });
  }
  // logLearning resolves worktree writes to the canonical main-worktree root
  // internally — mirror that here so the reported path matches where the
  // line actually landed instead of a worktree-local path that never merges.
  const canonicalRoot = await resolveCanonicalRepoRoot(repoPath);
  ledgerEvents.push(
    relOf(repoPath, path.join(canonicalRoot, ".claude", "artifacts", "loop", "learnings.jsonl"))
  );

  // The per-slice events ledger was already renamed (step 3, findBespokeFiles)
  // when a prior events file existed — appendSliceEvent's own eventsPath
  // computation targets whatever now lives at `${toId}-events.jsonl`, new or
  // freshly renamed, and fans the event out over the existing webhook stream.
  if (!dryRun) {
    await appendSliceEvent(repoPath, toId, {
      type: "slice_renumber",
      sliceId: toId,
      featureId,
      timestamp: ts,
      fromId
    });
  }
  ledgerEvents.push(relOf(repoPath, path.join(dirs.trajDir, `${toId}-events.jsonl`)));
}

function logPartialProgress(
  fromId: string,
  toId: string,
  renamed: string[],
  ledgerEvents: string[]
): void {
  const lines = [...renamed.map((r) => `rename: ${r}`), ...ledgerEvents.map((e) => `ledger: ${e}`)];
  console.error(
    `[slice-renumber] ${fromId} -> ${toId} failed partway through. Completed before the failure:\n` +
      (lines.length > 0 ? lines.map((l) => `  - ${l}`).join("\n") : "  (nothing yet)")
  );
}

/**
 * Renumbers a slice from `fromId` to `toId`: renames its markdown file plus
 * every referencing artifact, rewrites the owning FEAT's `slices:` entry,
 * and appends a corrective event to each append-only ledger. Refuses
 * (throws {@link SliceIdCollisionError}) rather than clobbering when `toId`
 * already exists as a slice file or a referencing artifact. Pass
 * `{ dryRun: true }` to list what would happen without mutating anything.
 *
 * Does not roll back a partial failure (disk full, a file lock, a
 * permission error after the collision check passes) — but never swallows
 * one either: throws {@link SliceRenumberPartialFailureError} carrying
 * exactly what had already been renamed/appended, and logs the same list
 * via console.error before rethrowing, so the operator can finish or revert
 * manually instead of inheriting an undocumented half-renamed slice. A
 * failure with zero progress (e.g. {@link SliceNotFoundError}, thrown before
 * any mutation) is rethrown as-is — wrapping it would only obscure the
 * original, more specific error for no diagnostic benefit.
 */
export async function renumberSlice(
  repoPath: string,
  fromId: string,
  toId: string,
  config: Record<string, any> | null = null,
  opts: RenumberSliceOpts = {}
): Promise<RenumberSliceResult> {
  assertSliceIdFormat(fromId, "from");
  assertSliceIdFormat(toId, "to");
  if (fromId.toUpperCase() === toId.toUpperCase()) {
    throw new SliceRenumberError("slice-renumber: --from and --to must differ.");
  }

  const dirs = renumberScanDirs(repoPath, config);
  if (await sliceIdInUse(repoPath, toId, dirs)) {
    throw new SliceIdCollisionError(toId);
  }

  const dryRun = opts.dryRun === true;
  const renamed: string[] = [];
  const ledgerEvents: string[] = [];

  try {
    const featureId = await renameSliceAndArtifacts(
      repoPath,
      fromId,
      toId,
      config,
      dirs,
      dryRun,
      renamed
    );

    const featureUpdate = await renumberFeatureSlicesEntry(
      repoPath,
      featureId,
      fromId,
      toId,
      config,
      dryRun
    );
    if (featureUpdate) renamed.push(featureUpdate);

    await appendLedgerEvents(repoPath, fromId, toId, featureId, dirs, dryRun, ledgerEvents);
  } catch (err) {
    if (renamed.length === 0 && ledgerEvents.length === 0) {
      throw err;
    }
    logPartialProgress(fromId, toId, renamed, ledgerEvents);
    throw new SliceRenumberPartialFailureError(fromId, toId, [...renamed], [...ledgerEvents], err);
  }

  return { renamed, ledgerEvents };
}
