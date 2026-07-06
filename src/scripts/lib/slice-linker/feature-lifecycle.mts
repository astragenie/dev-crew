import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveConfig } from "../config-resolver.mjs";
import { parseFrontmatter, mergeFrontmatter, serializeFrontmatter } from "../frontmatter.mjs";
import { findFeatureById, moveFeature, updateFeatureFrontmatter } from "../backlog-writer.mjs";
import { parseProposedSlices, type ProposedSlice } from "../proposed-slices.mjs";
import { pathExists, ensureDir, slicesRoot as resolveSlicesRoot } from "../paths.mjs";
import { parseClassifyOutput } from "../classify-parser.mjs";
import { writeFeatureEndCeremony } from "../ceremonies.mjs";
import { clampSliceTitle } from "../slice-title.mjs";
import { classifyRisk } from "../risk-classifier.mjs";
import type { FeatFrontmatterForRisk } from "../risk-classifier.mjs";
import type { DispatchOpts, DispatchResult } from "../auto-dispatch.mjs";
import { assertSized } from "../proposed-slices.mjs";

const execFileAsync = promisify(execFile);

type DispatchFn = (opts: {
  agent: string;
  prompt: string;
  parentCommand: string;
  repoRoot: string;
  argv?: string[];
  skipFlag?: string;
  sliceId?: string;
  featureId?: string;
  dispatchKind?: "auto" | "manual" | "wave" | "hierarchical" | null;
  iterationIndex?: number;
}) => Promise<DispatchResult>;

const SLICE_FILE_RE = /^SLICE[-_](\d+)/;

/**
 * Classifies a single line inside the `## Acceptance criteria` section and
 * returns its normalized `- [ ] …` form, or `null` when the line isn't a
 * recognized criteria bullet. Extracted from {@link extractAcceptanceCriteria}
 * to keep that function's cognitive complexity under the biome cap.
 *
 * Accepts two authoring formats:
 * - `- [ ]` / `- [x]` checkbox bullets (normalized to unchecked)
 * - FEAT-277 inline-AC prose: `- GIVEN … WHEN … THEN …` or `- AC-N: …`
 *   bullets (optionally bold-prefixed)
 */
function classifyAcceptanceCriteriaLine(line: string): string | null {
  // Checkbox lines (checked or unchecked). Normalize to unchecked per AC-3:
  // slice scaffold ACs start as work, not as already-done work, even if the
  // parent FEAT had check marks.
  if (/^- \[[ x]\]/.test(line)) {
    return line.replace(/^- \[x\]/i, "- [ ]");
  }
  // FEAT-277 inline-AC format: the PM writes Given-When-Then (or `AC-N:`)
  // prose bullets, often grouped under per-slice `### SN` subheadings, with
  // no checkbox. Accept those too — normalize to an unchecked checkbox so
  // the derived slice inherits the PM's real criteria instead of falling
  // through to AcceptanceCriteriaRequiredError. See astragenie/runner-plugin#322.
  const acText = line.match(/^-\s+(.*\S)\s*$/)?.[1];
  if (acText && /^\*{0,2}(given\b|ac-\d+\b)/i.test(acText)) {
    return `- [ ] ${acText}`;
  }
  return null;
}

/**
 * Parses the `## Acceptance criteria` section from a FEAT body and returns
 * the criteria as unchecked checkbox lines.
 *
 * Accepts two authoring formats — see {@link classifyAcceptanceCriteriaLine}.
 * including bullets grouped under per-slice `### SN` subheadings.
 *
 * Returns an empty array when:
 * - body is falsy
 * - no `## Acceptance criteria` heading found (case-insensitive)
 * - the section contains no recognized criteria lines (malformed)
 *
 * Stops at the next `##`-level heading so lines from later sections are
 * not included; `### SN` subheadings do not terminate the section.
 * See astragenie/runner-plugin#322.
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
    if (!inSection) continue;
    // Stop at the next ##-level heading (a `### SN` per-slice subheading is
    // NOT a `##` and does not break — its bullets are collected below).
    if (/^##\s/.test(line)) break;
    const normalized = classifyAcceptanceCriteriaLine(line);
    if (normalized) results.push(normalized);
  }
  return results;
}

/**
 * Refuse to scaffold a slice from a FEAT with no PM-authored acceptance
 * criteria. Placeholder AC auto-generation was removed — the PM owns AC
 * authoring, and a missing `## Acceptance criteria` section is a hard error,
 * not a template-filled stub.
 */
export class AcceptanceCriteriaRequiredError extends Error {
  constructor(public readonly featureId: string) {
    super(
      `${featureId} has no acceptance criteria — the PM must author at least one ` +
        "testable `## Acceptance criteria` bullet before a slice can be scaffolded. " +
        "Placeholder AC auto-generation was removed; run " +
        `\`/runner:triage --deep ${featureId}\` or \`/runner:pm-review ${featureId}\` to draft ACs.`
    );
    this.name = "AcceptanceCriteriaRequiredError";
  }
}

/**
 * Throws {@link AcceptanceCriteriaRequiredError} when `body` carries no
 * extractable acceptance-criteria bullets. Called before the in-progress
 * move so a refuse leaves backlog state untouched (mirrors `assertSized`).
 */
export function assertAcceptanceCriteria(featureId: string, body: string): void {
  if (extractAcceptanceCriteria(body).length === 0) {
    throw new AcceptanceCriteriaRequiredError(featureId);
  }
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
  featureBody,
  effortPoints
}: {
  id: string;
  title: string;
  featureId: string;
  featureFrontmatter: Record<string, unknown>;
  featureBody: string;
  effortPoints?: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const safeTitle = clampSliceTitle(title);
  const frontmatter: Record<string, unknown> = {
    id,
    title: safeTitle,
    status: "pending",
    feature: featureId,
    phase: featureFrontmatter.phase || null,
    priority: featureFrontmatter.priority || null,
    target_release: featureFrontmatter.target_release || null,
    requires_validation: true,
    risk: classifyRisk(featureFrontmatter as FeatFrontmatterForRisk),
    created: today,
    updated: today
  };
  if (typeof effortPoints === "number") {
    frontmatter.effort_points = effortPoints;
  }
  const featureDescriptionLine = (featureBody || "")
    .split(/\n+/)
    .find((line) => line && !line.startsWith("#") && !line.startsWith("---"));

  // No AC auto-generation: sliceFromFeature's assertAcceptanceCriteria gate
  // guarantees the FEAT body carries real ACs before we reach here. Refuse
  // loudly rather than fabricate placeholder ACs if a future caller bypasses
  // the gate.
  const acLines = extractAcceptanceCriteria(featureBody);
  if (acLines.length === 0) {
    throw new AcceptanceCriteriaRequiredError(featureId);
  }

  const body = [
    `# ${id}: ${safeTitle}`,
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
      skipFlag: "--no-classify",
      // SLICE-137: slice-from-feature is a direct slash-command dispatch.
      dispatchKind: "manual"
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

  // FEAT-168 AC-2: decomposition gate. Read the source FEAT frontmatter
  // BEFORE moving the file so a refuse-throw leaves backlog state
  // untouched. assertSized throws DecompositionRequiredError when a
  // >= 8-point FEAT lacks proposed_slices entirely. parseProposedSlices
  // (SLICE-100) consumes the array shape and materializes one slice per
  // proposal in the multi-slice path below. InvalidProposedSlicesError
  // propagates up to the CLI handler which audit-logs it.
  const sourceContent = await fs.readFile(entry.filePath, "utf8");
  const { frontmatter: sourceFM, body: sourceBody } = parseFrontmatter(sourceContent);
  assertSized(featureId, sourceFM.effort_points, sourceFM.proposed_slices);
  const proposed = parseProposedSlices(
    sourceFM.proposed_slices,
    featureId,
    typeof sourceFM.effort_points === "number" ? sourceFM.effort_points : undefined
  );
  // AC gate: refuse to scaffold when the FEAT lacks PM-authored acceptance
  // criteria. Both the single- and multi-slice paths derive every slice's ACs
  // from this FEAT body, so one up-front check covers both. Ordered after the
  // structural gates (sizing, proposed_slices parse) so those errors take
  // precedence, and checked before the in-progress move so a refuse leaves
  // backlog state untouched.
  assertAcceptanceCriteria(featureId, sourceBody);

  // Move feature to in-progress if not already.
  const movedFromState = entry.state;
  let featureFilePath = entry.filePath;
  if (entry.state !== "in-progress") {
    const result = await moveFeature(entry.filePath, "in-progress");
    featureFilePath = result.to;
  }

  const featureContent = await fs.readFile(featureFilePath, "utf8");
  const { frontmatter: featureFM, body: featureBody } = parseFrontmatter(featureContent);

  if (proposed && proposed.length > 0) {
    return await materializeProposedSlices({
      repoPath,
      featureId,
      featureFilePath,
      featureFM,
      featureBody,
      movedFromState,
      proposed,
      slicesRoot
    });
  }

  return await materializeSingleSlice({
    repoPath,
    featureId,
    featureFilePath,
    featureFM,
    featureBody,
    movedFromState,
    slicesRoot,
    noClassify,
    dispatchFn
  });
}

interface MaterializeSingleOpts {
  repoPath: string;
  featureId: string;
  featureFilePath: string;
  featureFM: Record<string, any>;
  featureBody: string;
  movedFromState: string;
  slicesRoot: string;
  noClassify?: boolean | undefined;
  dispatchFn?: DispatchFn | undefined;
}

async function materializeSingleSlice(opts: MaterializeSingleOpts) {
  const {
    repoPath,
    featureId,
    featureFilePath,
    featureFM,
    featureBody,
    movedFromState,
    slicesRoot,
    noClassify = false,
    dispatchFn
  } = opts;

  const maxId = await maxSliceIdUnder(slicesRoot);
  const id = sliceId(maxId + 1);

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

  const classifyResult = await classifySlice({
    repoPath,
    slicePath,
    featureFM,
    noClassify,
    ...(dispatchFn !== undefined ? { dispatchFn } : {})
  });

  const existingSlices = Array.isArray(featureFM.slices) ? featureFM.slices : [];
  if (!existingSlices.includes(id)) {
    await updateFeatureFrontmatter(featureFilePath, {
      slices: [...existingSlices, id]
    });
  }

  const sliceInfo = { id, path: slicePath, title };
  return {
    slice: sliceInfo,
    slices: [sliceInfo],
    feature: {
      id: featureId,
      path: featureFilePath,
      fromState: movedFromState,
      toState: "in-progress" as const
    },
    classify: classifyResult,
    idempotent: false
  };
}

interface MaterializeMultiOpts {
  repoPath: string;
  featureId: string;
  featureFilePath: string;
  featureFM: Record<string, any>;
  featureBody: string;
  movedFromState: string;
  proposed: ProposedSlice[];
  slicesRoot: string;
}

async function materializeProposedSlices(opts: MaterializeMultiOpts) {
  const {
    featureId,
    featureFilePath,
    featureFM,
    featureBody,
    movedFromState,
    proposed,
    slicesRoot
  } = opts;

  const sliceDir = path.join(slicesRoot, "pending");
  await ensureDir(sliceDir);

  const existingSlices = Array.isArray(featureFM.slices) ? featureFM.slices : [];

  // Idempotent rerun: if the feature already has at least as many slices
  // as proposed entries, do nothing further. Materialized slice files are
  // recorded on `slices`; their paths are recoverable by the caller via
  // the locate helpers if needed.
  if (existingSlices.length >= proposed.length) {
    const slicesInfo = existingSlices.slice(0, proposed.length).map((sid: string, i: number) => ({
      id: sid,
      path: null as string | null,
      title: proposed[i]!.title,
      points: proposed[i]!.points
    }));
    return {
      slice: slicesInfo[0]!,
      slices: slicesInfo,
      feature: {
        id: featureId,
        path: featureFilePath,
        fromState: movedFromState,
        toState: "in-progress" as const
      },
      classify: null,
      idempotent: true
    };
  }

  const maxId = await maxSliceIdUnder(slicesRoot);
  const toCreate = proposed.slice(existingSlices.length);
  const newSlices: { id: string; path: string; title: string; points: number }[] = [];

  for (let i = 0; i < toCreate.length; i += 1) {
    const id = sliceId(maxId + 1 + i);
    const title = toCreate[i]!.title;
    const points = toCreate[i]!.points;
    const slug = kebab(title);
    const slicePath = path.join(sliceDir, `${id.replace("-", "_")}_${slug.toUpperCase()}.md`);
    const slice = buildSliceContent({
      id,
      title,
      featureId,
      featureFrontmatter: featureFM,
      featureBody,
      effortPoints: points
    });
    await fs.writeFile(slicePath, slice);
    newSlices.push({ id, path: slicePath, title, points });
  }

  await updateFeatureFrontmatter(featureFilePath, {
    slices: [...existingSlices, ...newSlices.map((s) => s.id)]
  });

  return {
    slice: newSlices[0]!,
    slices: newSlices,
    feature: {
      id: featureId,
      path: featureFilePath,
      fromState: movedFromState,
      toState: "in-progress" as const
    },
    classify: null,
    idempotent: false
  };
}

export interface FeatureSimplifyOpts {
  skipSimplify?: boolean;
  sliceId?: string;
  startedAt?: string;
  dispatchFn?: (opts: DispatchOpts) => Promise<DispatchResult>;
}

export interface FeatureSimplifyResult {
  simplifyRan: boolean;
  skipped?: boolean;
  skipReason?: string;
  files?: string[];
  dispatchResult?: DispatchResult;
}

export async function featureSimplify(
  repoPath: string,
  featureId: string,
  opts: FeatureSimplifyOpts = {}
): Promise<FeatureSimplifyResult> {
  const { skipSimplify = false, sliceId, startedAt, dispatchFn } = opts;

  if (skipSimplify) {
    return { simplifyRan: false, skipped: true, skipReason: "skip-simplify-flag" };
  }

  const files = await collectChangedSourceFiles(repoPath, startedAt);

  if (files.length === 0) {
    return { simplifyRan: false, skipped: true, skipReason: "no-source-files" };
  }

  const dispatch =
    dispatchFn ??
    (async (dispatchOpts) => {
      const { dispatchAgent } = await import("../auto-dispatch.mjs");
      return dispatchAgent(dispatchOpts);
    });

  const prompt = buildSimplifyPrompt(featureId, files);
  const dispatchOpts: {
    agent: string;
    prompt: string;
    parentCommand: string;
    repoRoot: string;
    sliceId?: string;
    featureId?: string;
    dispatchKind: "manual";
  } = {
    agent: "code-simplifier:code-simplifier",
    prompt,
    parentCommand: "feature-simplify",
    repoRoot: repoPath,
    // SLICE-137: code-simplifier is a direct slash-command dispatch (not walker/wave).
    dispatchKind: "manual"
  };
  if (sliceId !== undefined) dispatchOpts.sliceId = sliceId;
  dispatchOpts.featureId = featureId;
  const dispatchResult = await dispatch(dispatchOpts);

  await writeFeatureEndCeremony(repoPath, {
    type: "feature-end",
    id: featureId,
    timestamp: new Date().toISOString(),
    status: "scaffold",
    simplifyRan: true
  });

  return { simplifyRan: true, files, dispatchResult };
}

async function collectChangedSourceFiles(repoPath: string, startedAt?: string): Promise<string[]> {
  try {
    const args = ["log", "--name-only", "--format=", "--diff-filter=AM"];
    if (startedAt) args.push(`--since=${startedAt}`);
    const { stdout } = await execFileAsync("git", args, { cwd: repoPath, timeout: 30_000 });
    const seen = new Set<string>();
    for (const line of stdout.split("\n")) {
      const f = line.trim();
      if ((f.endsWith(".mts") || f.endsWith(".mjs")) && !seen.has(f)) {
        seen.add(f);
      }
    }
    return [...seen];
  } catch {
    return [];
  }
}

function buildSimplifyPrompt(featureId: string, files: string[]): string {
  return [
    `Simplify the source files changed during feature ${featureId}.`,
    "Rules: simplify only — no behavior changes, no new tests, no scope expansion.",
    "Files to simplify:",
    ...files.map((f) => `  - ${f}`)
  ].join("\n");
}
