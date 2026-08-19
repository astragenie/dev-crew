// Extracted from scripts/crew.mts's "cost-advise" command body (SLICE-11,
// P2 seam-elimination contract §1). Previously an unexported local helper
// inside crew.mts, reachable only via the CLI subprocess. Exported here so
// runner-plugin's crew-bridge.mts can call it as a direct import instead of
// shelling out to `crew cost-advise`. No behavior change from the original.

import fs from "node:fs/promises";
import path from "node:path";

// Slug source priority: explicit --title → advisor target slice → advisor
// target runTitle → fallback "advise". --title lets the loop side pass the
// enriched FEAT/PHASE/SLICE tag so cost-advise filenames match the rest of
// the artifact surface.
function buildCostAdviseSlug(title: string | null, advisor: Record<string, unknown> | null) {
  const t = advisor?.["target"] as { sliceId?: string; runTitle?: string } | null | undefined;
  const source = title || t?.sliceId || t?.runTitle || "advise";
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Optional YAML frontmatter block; "" when both feature + phase absent so
// existing output stays byte-identical for legacy callers.
function buildOptionalFrontmatter(feature: string | null, phase: string | null) {
  const lines = [];
  if (phase !== null && phase !== undefined && String(phase).length > 0) {
    lines.push(`phase: ${JSON.stringify(String(phase))}`);
  }
  if (feature) lines.push(`feature: ${feature}`);
  if (lines.length === 0) return "";
  return ["---", ...lines, "---", ""].join("\n");
}

export async function writeCostAdviseArtifact(
  repoPath: string,
  md: string,
  advisor: Record<string, unknown> | null,
  options: { title?: string | null; feature?: string | null; phase?: string | null } = {}
): Promise<string> {
  const { title = null, feature = null, phase = null } = options;
  const dir = path.join(repoPath, ".claude", "artifacts", "crew", "cost-insights");
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  const slug = buildCostAdviseSlug(title, advisor);
  const fm = buildOptionalFrontmatter(feature, phase);
  const file = path.join(dir, `${stamp}-cost-advise-${slug}.md`);
  await fs.writeFile(file, fm + md + "\n");
  return file;
}
