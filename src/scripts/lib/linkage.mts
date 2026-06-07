import { listBacklog } from "./backlog-parser.mjs";
import { listSpecs, updateSpecFrontmatter } from "./spec-parser.mjs";

// Bidirectional linkage helpers. SPEC.derived_features ←→ FEAT.derived_from.
// FEAT.slices ←→ SLICE files referencing the FEAT id. Plugin maintains the
// SPEC↔FEAT side here; SLICE↔FEAT lives in the slice files (text references)
// and is read on demand.

export async function specSatisfaction(
  repoPath: string,
  config: Record<string, any> | null = null
) {
  const specs = await listSpecs(repoPath, { config });
  const backlog = await listBacklog(repoPath, { config });
  const results: Record<string, unknown>[] = [];
  for (const spec of specs) {
    const derived = Array.isArray(spec.frontmatter.derived_features)
      ? spec.frontmatter.derived_features
      : [];
    if (derived.length === 0) {
      results.push({ id: spec.id, state: "no-features", total: 0, done: 0, pct: 0 });
      continue;
    }
    const matching = backlog.filter((f: { id: string; state: string }) => derived.includes(f.id));
    const done = matching.filter((f: { id: string; state: string }) => f.state === "done").length;
    const pct = matching.length === 0 ? 0 : Math.round((done / matching.length) * 100);
    results.push({
      id: spec.id,
      state: done === matching.length && matching.length > 0 ? "satisfied" : "in-progress",
      total: matching.length,
      done,
      pct,
      missing: derived.filter(
        (id: string) => !matching.find((f: { id: string; state: string }) => f.id === id)
      )
    });
  }
  return results;
}

// Auto-roll SPEC status to "satisfied" when all derived features are done.
// Safe to run idempotently — only writes if status would actually change.
export async function reconcileSpecStatus(
  repoPath: string,
  config: Record<string, any> | null = null
) {
  const specs = await listSpecs(repoPath, { config });
  const backlog = await listBacklog(repoPath, { config });
  const updates: Record<string, unknown>[] = [];
  for (const spec of specs) {
    const derived = Array.isArray(spec.frontmatter.derived_features)
      ? spec.frontmatter.derived_features
      : [];
    if (derived.length === 0) continue;
    const matching = backlog.filter((f: { id: string; state: string }) => derived.includes(f.id));
    if (matching.length === 0) continue;
    const allDone = matching.every((f: { id: string; state: string }) => f.state === "done");
    const current = spec.frontmatter.status;
    if (allDone && current !== "satisfied" && current !== "archived") {
      await updateSpecFrontmatter(spec.filePath, { status: "satisfied" });
      updates.push({ id: spec.id, from: current, to: "satisfied" });
    }
  }
  return updates;
}

// Add a FEAT id to a spec's derived_features list. Idempotent.
export async function linkFeatureToSpec(
  repoPath: string,
  specId: string,
  featureId: string,
  config: Record<string, any> | null = null
) {
  const specs = await listSpecs(repoPath, { config });
  const spec = specs.find((s: { id: string }) => s.id === specId);
  if (!spec) {
    throw new Error(`Spec not found: ${specId}`);
  }
  const current = Array.isArray(spec.frontmatter.derived_features)
    ? spec.frontmatter.derived_features
    : [];
  if (current.includes(featureId)) {
    return { spec: specId, feature: featureId, alreadyLinked: true };
  }
  const next = [...current, featureId];
  await updateSpecFrontmatter(spec.filePath, {
    derived_features: next,
    status: spec.frontmatter.status === "approved" ? "decomposed" : spec.frontmatter.status
  });
  return { spec: specId, feature: featureId, alreadyLinked: false };
}
