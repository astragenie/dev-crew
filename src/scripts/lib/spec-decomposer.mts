import { listSpecs } from "./spec-parser.mjs";
import { addFeature } from "./backlog-writer.mjs";
import { linkFeatureToSpec } from "./linkage.mjs";

// Decomposition orchestration. The plugin doesn't make LLM calls itself;
// the AGENT (Claude) does the semantic reasoning when running the
// /loop:spec decompose command. This helper exists for the
// programmatic / scripted path: given a list of features the caller has
// already identified, it materializes the FEAT-NNN files and wires the
// SPEC↔FEAT linkage.
//
// Typical use:
//   1. Agent reads SPEC body, identifies discrete features
//   2. Agent calls /loop:spec decompose with the feature titles
//   3. This module creates each FEAT in pending/ + links back to the spec

export async function decomposeSpec(
  repoPath: string,
  specId: string,
  featureTitles: Array<
    | string
    | {
        title?: string;
        priority?: string | null;
        category?: string | null;
        target_release?: string | null;
        body?: string;
      }
  >,
  config: Record<string, any> | null = null
) {
  if (!Array.isArray(featureTitles) || featureTitles.length === 0) {
    throw new Error("decomposeSpec requires a non-empty array of feature titles.");
  }
  const specs = await listSpecs(repoPath, { config });
  const spec = specs.find(
    (s: { id: string; frontmatter: Record<string, unknown> }) => s.id === specId
  );
  if (!spec) {
    throw new Error(`Spec not found: ${specId}`);
  }
  const created: any[] = [];
  for (const entry of featureTitles) {
    const title = typeof entry === "string" ? entry : entry.title;
    const extra = typeof entry === "object" ? entry : {};
    if (!title) continue;
    const result = await addFeature(repoPath, {
      title,
      priority: extra.priority || spec.frontmatter.priority || null,
      category: extra.category || null,
      target_release: extra.target_release || spec.frontmatter.target_release || null,
      derived_from: spec.id,
      body: extra.body || undefined,
      config
    });
    await linkFeatureToSpec(repoPath, spec.id, result.id, config);
    created.push({ id: result.id, title, filePath: result.filePath });
  }
  return { spec: spec.id, created, count: created.length };
}
