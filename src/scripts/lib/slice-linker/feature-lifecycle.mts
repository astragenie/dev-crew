import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig } from "../config-resolver.mjs";
import { parseFrontmatter, mergeFrontmatter, serializeFrontmatter } from "../frontmatter.mjs";
import { findFeatureById, moveFeature, updateFeatureFrontmatter } from "../backlog-writer.mjs";
import { pathExists, ensureDir, slicesRoot as resolveSlicesRoot } from "../paths.mjs";
import { parseClassifyOutput } from "../classify-parser.mjs";
import type { DispatchResult } from "../auto-dispatch.mjs";

type DispatchFn = (opts: {
  agent: string;
  prompt: string;
  parentCommand: string;
  repoRoot: string;
  argv?: string[];
  skipFlag?: string;
}) => Promise<DispatchResult>;

const SLICE_FILE_RE = /^SLICE[-_](\d+)/;

/**
 * Parses the `## Acceptance criteria` section from a FEAT body and returns
 * the checkbox lines verbatim.
 *
 * Returns an empty array when:
 * - body is falsy
 * - no `## Acceptance criteria` heading found (case-insensitive)
 * - the section contains no `- [ ]` or `- [x]` lines (malformed)
 *
 * Stops at the next `##`-level heading so lines from later sections are
 * not included.
 */
export function extractAcceptanceCriteria(body: string): string[] {
  if (!body) return [];
  const lines = body.split("\n");
  let inSection = false;
  const results: string[] = [];
  for (const line of lines) {
    if (/^##\s+acceptance criteria\s*$/i.test(line.trim())) {
      inSection = true;
      continue;
    }
    if (inSection) {
      // Stop at the next ## heading
      if (/^##\s/.test(line)) break;
      // Collect checkbox lines (checked or unchecked).
      // Normalize to unchecked per AC-3: slice scaffold ACs start as work,
      // not as already-done work, even if the parent FEAT had check marks.
      if (/^- \[[ x]\]/.test(line)) {
        results.push(line.replace(/^- \[x\]/i, "- [ ]"));
      }
    }
  }
  return results;
}

// Walks slicesRoot recursively, returns the max numeric slice id found.
async function maxSliceIdUnder(dir: string) {
  if (!(await pathExists(dir))) return 0;
  let max = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
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

function sliceId(n: number) {
  return `SLICE-${String(n).padStart(2, "0")}`;
}

function kebab(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function buildSliceContent({
  id,
  title,
  featureId,
  featureFrontmatter,
  featureBody
}: {
  id: string;
  title: string;
  featureId: string;
  featureFrontmatter: Record<string, unknown>;
  featureBody: string;
}) {
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

  const derivedAcs = extractAcceptanceCriteria(featureBody);
  const acLines =
    derivedAcs.length > 0
      ? derivedAcs
      : [
          "- [ ] AC-1: All tests pass (npm test) and linter is clean (npm run lint)",
          "- [ ] AC-2: <replace with a concrete, testable acceptance criterion>"
        ];

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
    ...acLines,
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

// Mirror of classify-parser's ClassifyResult — kept local to avoid a circular
// `import type` from a sibling lib module. Stack / surface are deliberately
// absent: preset-driven skill activation (scripts/presets/*.json) is the sole
// source of project-level stack identity.
type ClassifyResult = {
  tags: string[];
  needs_contract: boolean | null;
  needs_ux: boolean | null;
};

function featureHasTags(fm: Record<string, unknown>): boolean {
  if (Array.isArray(fm.tags)) return fm.tags.length > 0;
  return fm.tags != null && fm.tags !== "";
}

function buildClassifyUpdates(parsed: ClassifyResult): Record<string, unknown> | null {
  const updates: Record<string, unknown> = {};
  if (parsed.tags.length > 0) updates.tags = parsed.tags;
  if (parsed.needs_contract !== null) updates.needs_contract = parsed.needs_contract;
  if (parsed.needs_ux !== null) updates.needs_ux = parsed.needs_ux;
  return Object.keys(updates).length > 0 ? updates : null;
}

async function classifySlice({
  repoPath,
  slicePath,
  featureFM,
  noClassify,
  dispatchFn
}: {
  repoPath: string;
  slicePath: string;
  featureFM: Record<string, unknown>;
  noClassify: boolean;
  dispatchFn?: DispatchFn;
}): Promise<ClassifyResult | null> {
  if (noClassify || featureHasTags(featureFM)) return null;
  try {
    const { dispatchAgent } = await import("../auto-dispatch.mjs");
    const dispatch = dispatchFn ?? dispatchAgent;
    const prompt =
      `Classify this slice for the orchestrate-slice router.\n` +
      `Read ${slicePath} for context. Respond with ONLY this key:value block — no preamble, no headings:\n` +
      `tags: [<labels from: api-change, storage, workflow, ux, auth, infra, test, docs, refactor>]\n` +
      `needs_contract: <true|false>\n` +
      `needs_ux: <true|false>`;
    const dispatchOut = await dispatch({
      agent: "loop:architect",
      prompt,
      parentCommand: "slice from-feature",
      repoRoot: repoPath,
      argv: [],
      skipFlag: "--no-classify"
    });
    if (dispatchOut.ok && !dispatchOut.skipped && dispatchOut.output) {
      const parsed = parseClassifyOutput(dispatchOut.output);
      const updates = buildClassifyUpdates(parsed);
      if (updates) {
        const sliceContent = await fs.readFile(slicePath, "utf8");
        await fs.writeFile(slicePath, mergeFrontmatter(sliceContent, updates), "utf8");
        return parsed;
      }
    }
  } catch (err) {
    console.warn(
      `[slice from-feature] classify dispatch failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  return null;
}

// Creates a slice file under <slicesRoot>/pending/ from a feature.
// - Looks up feature in any backlog state.
// - Moves feature -> in-progress/ if not already there.
// - Allocates next SLICE id by scanning slicesRoot recursively.
// - Writes the slice file with cross-reference to the feature.
// - Updates feature.slices += [SLICE-NN] in frontmatter.
// - Optionally dispatches loop:architect to classify the slice
//   (tags, needs_contract, needs_ux); skipped when noClassify is true
//   or when the feature already has tags set.
//
// Returns { slice: {id, path}, feature: {id, path, fromState, toState}, classify }.
export async function sliceFromFeature(
  repoPath: string,
  featureId: string,
  {
    config = null,
    noClassify = false,
    dispatchFn
  }: { config?: any; noClassify?: boolean; dispatchFn?: DispatchFn } = {}
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

  // Classify the slice (tags, needs_contract, needs_ux) unless opted out
  // or the feature already has tags.
  const classifyResult = await classifySlice({
    repoPath,
    slicePath,
    featureFM,
    noClassify,
    ...(dispatchFn !== undefined ? { dispatchFn } : {})
  });

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
    },
    classify: classifyResult
  };
}
