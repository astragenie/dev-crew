// Shared merge+write+cache-bust primitive behind updateFeatureFrontmatter
// (feature-store.mts) and updateSliceFrontmatter (slice-store.mts) — same
// shape, different root, no behavior divergence today. Kept as a single
// implementation (rather than the two independently-maintained byte-
// identical bodies that predated the FEAT-262 split) so a future frontmatter-
// merge behavior change lands once; a schema-validation divergence between
// features and slices still has a natural seam to land in without touching
// call sites — just branch inside this function or reintroduce a second one.

import fs from "node:fs/promises";

import { parseFrontmatter, mergeFrontmatter } from "../frontmatter.mjs";
import { clearAll } from "../cache.mjs";
import { clearFrontmatterCache } from "../frontmatter-cache.mjs";
import { assertStatePath } from "../state-paths.mjs";

export function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function mergeAndWriteFrontmatter(
  filePath: string,
  updates: Record<string, any>,
  repoPath?: string,
  config?: Record<string, any> | null
) {
  if (repoPath) {
    assertStatePath(repoPath, config, filePath);
  }
  const content = await fs.readFile(filePath, "utf8");
  const merged = mergeFrontmatter(content, { ...updates, updated: nowIsoDate() });
  await fs.writeFile(filePath, merged);
  clearAll();
  // Windows mtime granularity (~16ms) lets rapid writes share an mtime with
  // the previous content, which leaves readFrontmatterCached pinned to the
  // stale parse. Clear the frontmatter cache so the next listBacklog read
  // sees the new content.
  clearFrontmatterCache();
  return parseFrontmatter(merged).frontmatter;
}
