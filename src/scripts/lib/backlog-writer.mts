// Thin delegate module — all backlog feature-write logic lives in
// backlog-store.mts (DEC-076, FEAT-250 SLICE-2). Kept as a separate file,
// with these exact exported names/signatures unchanged, so none of the 11
// existing callers need to change their import path or call shape.
import { createFeature, updateFeatureFrontmatter, moveFeature, getById } from "./backlog-store.mjs";

export { ensureBacklogScaffold } from "./backlog-store.mjs";
export { updateFeatureFrontmatter, moveFeature };

// Re-export, not a wrapper call — zero indirection overhead, zero behavior
// risk (same function object as backlog-store's createFeature).
export const addFeature = createFeature;

export function findFeatureById(
  repoPath: string,
  featureId: string,
  config: Record<string, any> | null = null
) {
  return getById(repoPath, "feature", featureId, config);
}
