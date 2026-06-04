import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig } from "../config-resolver.mjs";
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.mjs";
import { findFeatureById, moveFeature, updateFeatureFrontmatter } from "../backlog-writer.mjs";
import { pathExists, ensureDir, slicesRoot as resolveSlicesRoot } from "../paths.mjs";

const SLICE_FILE_RE = /^SLICE[-_](\d+)/;

// Walks slicesRoot recursively, returns the max numeric slice id found.
async function maxSliceIdUnder(dir) {
  if (!(await pathExists(dir))) return 0;
  let max = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      const m = entry.name.match(SLICE_FILE_RE);
      if (m) {
        const n = Number(m[1]);
        if (n > max) max = n;
      }
    }
  }
  return max;
}

function sliceId(n) {
  return `SLICE-${String(n).padStart(2, "0")}`;
}

function kebab(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function buildSliceContent({ id, title, featureId, featureFrontmatter, featureBody }) {
  const today = new Date().toISOString().slice(0, 10);
  const frontmatter = {
    id,
    status: "pending",
    feature: featureId,
    phase: featureFrontmatter.phase || null,
    priority: featureFrontmatter.priority || null,
    target_release: featureFrontmatter.target_release || null,
    requires_validation: true,
    created: today,
    updated: today
  };
  const featureDescriptionLine = (featureBody || "")
    .split(/\n+/)
    .find((line) => line && !line.startsWith("#") && !line.startsWith("---"));
  const body = [
    `# ${id}: ${title}`,
    "",
    `Implements ${featureId}. See [feature file](../../../backlog/in-progress/${featureId}.md) for product context.`,
    "",
    "## Objective",
    "",
    featureDescriptionLine
      ? featureDescriptionLine.trim()
      : "(restate the user-visible outcome of the parent feature)",
    "",
    "## In scope",
    "",
    "- bullet 1",
    "- bullet 2",
    "",
    "## Out of scope",
    "",
    "- bullet 1",
    "",
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: All tests pass (npm test) and linter is clean (npm run lint)",
    "- [ ] AC-2: <replace with a concrete, testable acceptance criterion>",
    "",
    "## Done When",
    "",
    "- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`",
    "- build / test commands per `.claude/loop.json` pass",
    `- feature ${featureId} moved from \`in-progress/\` to \`done/\``,
    "- Crew `final-synthesis` artifact written",
    "- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter",
    "   above to waive the validation gate — no badge needed at close time)",
    "",
    "## Reviewer ladder",
    "",
    "- Reviewer A: ...",
    "- Reviewer B: ...",
    ""
  ].join("\n");
  return serializeFrontmatter(frontmatter, body);
}

// Creates a slice file under <slicesRoot>/pending/ from a feature.
// - Looks up feature in any backlog state.
// - Moves feature -> in-progress/ if not already there.
// - Allocates next SLICE id by scanning slicesRoot recursively.
// - Writes the slice file with cross-reference to the feature.
// - Updates feature.slices += [SLICE-NN] in frontmatter.
//
// Returns { slice: {id, path}, feature: {id, path, fromState, toState} }.
export async function sliceFromFeature(
  repoPath,
  featureId,
  { config = null }: Record<string, unknown> = {}
) {
  if (!featureId) throw new Error("sliceFromFeature requires a featureId.");
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);

  const entry = await findFeatureById(repoPath, featureId);
  if (!entry) throw new Error(`Feature not found: ${featureId}`);

  // Move feature to in-progress if not already.
  const movedFromState = entry.state;
  let featureFilePath = entry.filePath;
  if (entry.state !== "in-progress") {
    const result = await moveFeature(entry.filePath, "in-progress");
    featureFilePath = result.to;
  }

  // Allocate next slice id.
  const maxId = await maxSliceIdUnder(slicesRoot);
  const nextNumber = maxId + 1;
  const id = sliceId(nextNumber);

  // Title from first heading in feature body, fallback to first non-empty line.
  const featureContent = await fs.readFile(featureFilePath, "utf8");
  const { frontmatter: featureFM, body: featureBody } = parseFrontmatter(featureContent);
  const titleLine = (featureBody || "").split("\n").find((l) => l.startsWith("# "));
  const title = titleLine
    ? titleLine.replace(/^#\s+[A-Z]+-\d+:\s*/, "").trim()
    : `Implement ${featureId}`;

  const sliceDir = path.join(slicesRoot, "pending");
  await ensureDir(sliceDir);
  const slug = kebab(title);
  const slicePath = path.join(sliceDir, `${id.replace("-", "_")}_${slug.toUpperCase()}.md`);
  const slice = buildSliceContent({
    id,
    title,
    featureId,
    featureFrontmatter: featureFM,
    featureBody
  });
  await fs.writeFile(slicePath, slice);

  // Cross-link on the feature side: append slice id to slices[] frontmatter
  const existingSlices = Array.isArray(featureFM.slices) ? featureFM.slices : [];
  if (!existingSlices.includes(id)) {
    await updateFeatureFrontmatter(featureFilePath, {
      slices: [...existingSlices, id]
    });
  }

  return {
    slice: { id, path: slicePath, title },
    feature: {
      id: featureId,
      path: featureFilePath,
      fromState: movedFromState,
      toState: "in-progress"
    }
  };
}
