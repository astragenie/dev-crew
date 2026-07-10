// BacklogStore — sole direct-fs writer for backlog feature and slice
// lifecycle state. See DEC-076 (.claude/artifacts/loop/decisions/DEC-076.md)
// and the design artifact
// .claude/artifacts/crew/runs/2026-07-10-backlogstore-design.md.
//
// FEAT-262 split this module (it had grown past the repo's ~400-line
// convention carrying two responsibilities — typescript-reviewer MEDIUM
// finding on PR #441) into backlog-store/{feature-store,slice-store,
// shared}.mts:
//   - feature-store.mts — createFeature, updateFeatureFrontmatter, moveFeature
//     (the FEAT-250 SLICE-2 function bodies).
//   - slice-store.mts — createSlice, updateSliceFrontmatter, moveSlice, and
//     the acceptance-criteria helpers (the FEAT-250 SLICE-3 function bodies).
//   - shared.mts — the merge+write+cache-bust primitive both sides delegate
//     through (updateFeatureFrontmatter and updateSliceFrontmatter were
//     byte-identical twins before this split; they now share one
//     implementation instead of two independently-maintained copies).
//
// This file is the barrel: every existing importer keeps importing from
// "./backlog-store.mjs" unchanged. validate-imports.mts enforces that
// non-barrel callers cannot reach into backlog-store/ directly, mirroring
// the slice-linker.mts precedent.
//
// getById and listByState dispatch across both sub-modules by `kind` and so
// live here rather than in either sub-module.

import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { slicesRoot, locateSliceFile } from "./paths.mjs";
import { readSliceEntry, readSliceStateEntries } from "./backlog-store/slice-store.mjs";

export {
  ensureBacklogScaffold,
  createFeature,
  updateFeatureFrontmatter,
  moveFeature
} from "./backlog-store/feature-store.mjs";
export {
  extractAcceptanceCriteria,
  AcceptanceCriteriaRequiredError,
  assertAcceptanceCriteria,
  createSlice,
  updateSliceFrontmatter,
  moveSlice,
  renameSliceId
} from "./backlog-store/slice-store.mjs";
export type { CreateSliceOpts, CreateSliceResult } from "./backlog-store/slice-store.mjs";

// getById — kind:"feature" is the current findFeatureById body, moved
// verbatim (backlog-writer.mts re-exports findFeatureById as a thin
// wrapper). kind:"slice" scans all slice state dirs for an id match, reusing
// the same locateSliceFile regex lookup every existing slice-file caller
// already depends on (paths.mts) so id-matching semantics stay identical.
export async function getById(
  repoPath: string,
  kind: "feature" | "slice",
  id: string,
  config: Record<string, any> | null = null
) {
  if (kind === "feature") {
    const entries = await listBacklog(repoPath, { config });
    return entries.find((e: Record<string, any>) => e.id === id) || null;
  }
  const slicesRootDir = slicesRoot(repoPath, config);
  const filePath = await locateSliceFile(slicesRootDir, id);
  if (!filePath) return null;
  return readSliceEntry(filePath);
}

/**
 * Lists backlog entries in a given state. `kind: "feature"` reuses the
 * existing listBacklog/filterBacklog pair (backlog-parser.mts) — no new
 * feature-listing logic. `kind: "slice"` reads `<slicesRoot>/<state>/`
 * directly since no shared slice-listing helper existed before SLICE-3.
 */
export async function listByState(
  repoPath: string,
  kind: "feature" | "slice",
  state: string,
  config: Record<string, any> | null = null
) {
  if (kind === "feature") {
    return filterBacklog(await listBacklog(repoPath, { config }), { status: state });
  }
  const slicesRootDir = slicesRoot(repoPath, config);
  return readSliceStateEntries(slicesRootDir, state);
}
