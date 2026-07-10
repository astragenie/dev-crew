// BacklogStore — sole direct-fs writer for backlog feature and slice
// lifecycle state. See DEC-076 (.claude/artifacts/loop/decisions/DEC-076.md)
// and the design artifact
// .claude/artifacts/crew/runs/2026-07-10-backlogstore-design.md.
//
// FEAT-250 SLICE-2 landed the feature side: createFeature,
// updateFeatureFrontmatter, moveFeature, and getById(kind:"feature") are
// the existing backlog-writer.mts function bodies moved verbatim (byte-
// identical behavior — AC-1). backlog-writer.mts re-exports/delegates to
// these.
//
// FEAT-250 SLICE-3 adds the slice side: createSlice, updateSliceFrontmatter,
// moveSlice, listByState, and getById(kind:"slice"). extractAcceptanceCriteria
// / AcceptanceCriteriaRequiredError / assertAcceptanceCriteria moved here
// (from slice-linker/feature-lifecycle.mts) because createSlice's private
// buildSliceMarkdown helper needs them and backlog-store.mts, living outside
// slice-linker/, cannot import slice-linker's submodules directly
// (validate-imports.mts boundary) — feature-lifecycle.mts re-exports these
// three names from here so no external import path changes.

import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter, mergeFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import {
  backlogRoot,
  listBacklog,
  nextFeatureId,
  BACKLOG_STATES,
  filterBacklog
} from "./backlog-parser.mjs";
import { pathExists, ensureDir, slicesRoot, locateSliceFile } from "./paths.mjs";
import { bust, clearAll } from "./cache.mjs";
import { clearFrontmatterCache } from "./frontmatter-cache.mjs";
import { assertStatePath } from "./state-paths.mjs";
import { validateFeat } from "./state-schemas.mjs";
import { emitBacklogStateChanged } from "./backlog-state-emitter.mjs";
import { clampSliceTitle } from "./slice-title.mjs";
import { classifyRisk } from "./risk-classifier.mjs";
import type { FeatFrontmatterForRisk } from "./risk-classifier.mjs";

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildFeatFrontmatter({
  id,
  today,
  priority,
  category,
  target_release,
  derived_from,
  github_issue,
  github_url
}: {
  id: string;
  today: string;
  priority: unknown;
  category: unknown;
  target_release: unknown;
  derived_from: unknown;
  github_issue: unknown;
  github_url: unknown;
}): Record<string, unknown> {
  const fm: Record<string, unknown> = {
    id,
    status: "pending",
    priority,
    category,
    target_release,
    created: today,
    updated: today,
    depends_on: [] as string[],
    slices: [] as string[],
    derived_from: derived_from || null
  };
  if (github_issue != null) fm.github_issue = github_issue;
  if (github_url != null) fm.github_url = github_url;
  return fm;
}

export async function ensureBacklogScaffold(
  repoPath: string,
  config: Record<string, unknown> | null
) {
  const root = backlogRoot(repoPath, config);
  assertStatePath(repoPath, config, root);
  for (const state of BACKLOG_STATES) {
    const dir = path.join(root, state);
    await ensureDir(dir);
    const keep = path.join(dir, ".gitkeep");
    if (!(await pathExists(keep))) {
      await fs.writeFile(keep, "");
    }
  }
  return root;
}

/**
 * @param {string} repoPath
 * @param {{
 *   title?: string,
 *   body?: string,
 *   priority?: string | null,
 *   category?: string | null,
 *   target_release?: string | null,
 *   derived_from?: string | string[] | null,
 *   github_issue?: number | null,
 *   github_url?: string | null,
 *   config?: any
 * }} [options]
 */
export async function createFeature(
  repoPath: string,
  {
    title,
    body = "",
    priority = null,
    category = null,
    target_release = null,
    derived_from = null,
    github_issue = null,
    github_url = null,
    config = null
  }: Record<string, any> = {}
) {
  if (!title || typeof title !== "string") {
    throw new Error("addFeature requires a non-empty title.");
  }
  const root = await ensureBacklogScaffold(repoPath, config);
  const id = await nextFeatureId(repoPath, { config });
  const today = nowIsoDate();
  const frontmatter = buildFeatFrontmatter({
    id,
    today,
    priority,
    category,
    target_release,
    derived_from,
    github_issue,
    github_url
  });
  const docBody =
    body ||
    [
      `# ${id}: ${title}`,
      "",
      "## Description",
      "",
      "(describe the feature in PM-friendly language)",
      "",
      "## Acceptance hints",
      "",
      "- bullet 1",
      "- bullet 2",
      ""
    ].join("\n");
  const fullBody = docBody.startsWith("#") ? docBody : `# ${id}: ${title}\n\n${docBody}`;

  const check = validateFeat(frontmatter);
  if (!check.ok) {
    throw new Error(`addFeature: schema-invalid frontmatter — ${check.issues.join("; ")}`);
  }

  const contents = serializeFrontmatter(frontmatter, fullBody);
  const filePath = path.join(root, "pending", `${id}.md`);
  assertStatePath(repoPath, config, filePath);
  await fs.writeFile(filePath, contents);
  bust(`listBacklog:${repoPath}`);
  return { id, filePath, frontmatter };
}

export async function updateFeatureFrontmatter(
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

export async function moveFeature(
  filePath: string,
  toState: string,
  updates: Record<string, any> = {},
  repoPath?: string,
  config?: Record<string, any> | null
) {
  if (!BACKLOG_STATES.includes(toState)) {
    throw new Error(`Unknown backlog state: ${toState}`);
  }
  const filename = path.basename(filePath);
  const fromDir = path.dirname(filePath);
  const fromState = path.basename(fromDir);
  const targetDir = path.join(path.dirname(fromDir), toState);
  await ensureDir(targetDir);
  const targetPath = path.join(targetDir, filename);
  if (repoPath) {
    assertStatePath(repoPath, config, targetPath);
  }
  const content = await fs.readFile(filePath, "utf8");
  const { frontmatter: existingFm } = parseFrontmatter(content);
  // Lifecycle timestamps. Set started_at the FIRST time a feature enters
  // in-progress; completed_at the FIRST time it enters done. Idempotent —
  // don't overwrite values already set (so re-entering a state preserves
  // the original timeline).
  const lifecycle: Record<string, any> = {};
  if (toState === "in-progress" && !existingFm.started_at) {
    lifecycle.started_at = nowIsoDate();
  }
  if (toState === "done" && !existingFm.completed_at) {
    lifecycle.completed_at = nowIsoDate();
  }
  const merged = mergeFrontmatter(content, {
    ...updates,
    ...lifecycle,
    status: toState,
    updated: nowIsoDate()
  });
  await fs.writeFile(targetPath, merged);
  if (targetPath !== filePath) {
    await fs.unlink(filePath);
  }
  clearAll();
  // M5 / L5-3: emit loop.backlog_state_changed envelope. Fire only when
  // we actually moved between distinct state directories (no-op when
  // toState === fromState). featId from frontmatter, falling back to
  // filename stem (FEAT-NNN.md). repoPath derived from path structure
  // when not supplied — backlog files always live under
  // <repo>/.claude/artifacts/loop/backlog/<state>/<file>.md.
  if (fromState !== toState) {
    const featId =
      (typeof existingFm.id === "string" && existingFm.id) || filename.replace(/\.md$/i, "");
    const repoRoot = repoPath ?? deriveRepoRootFromBacklogPath(filePath);
    if (repoRoot) {
      await emitBacklogStateChanged(repoRoot, {
        featId,
        fromState,
        toState,
        ...doraFieldsFromFrontmatter(existingFm)
      });
    }
  }
  return { from: filePath, to: targetPath };
}

// FEAT-247 / A2: forward DORA CFR/MTTR fields out of existingFm. Every field
// is returned explicitly (falling back to null) rather than omitted when
// absent, so the emitted envelope always carries the key — a missing FEAT
// field is a known-null signal, not a dropped one.
function stringOrNull(value: unknown): string | null {
  return (typeof value === "string" && value) || null;
}

function doraFieldsFromFrontmatter(existingFm: Record<string, any>) {
  return {
    priority: stringOrNull(existingFm.priority),
    category: stringOrNull(existingFm.category),
    relates_to: stringOrNull(existingFm.relates_to),
    createdAt: stringOrNull(existingFm.created)
  };
}

/**
 * Derive the repo root from a backlog file path. Backlog files always live at
 * `<repoRoot>/<backlogRoot>/<state>/<feat>.md`. We walk up four levels from
 * the file to land on the repo root assuming the canonical default backlog
 * root (`.claude/artifacts/loop/backlog`). Returns null when the path shape
 * doesn't match — callers must treat that as "no signal".
 */
function deriveRepoRootFromBacklogPath(filePath: string): string | null {
  // .../backlog/<state>/<file>.md → walk up 5 levels to skip
  //   <file>.md → <state>/ → backlog/ → loop/ → artifacts/ → .claude/
  // and land on the repo root.
  const parts = filePath.split(/[/\\]/);
  const backlogIdx = parts.lastIndexOf("backlog");
  if (backlogIdx < 0) return null;
  // Expected: parts[backlogIdx-3] === ".claude"
  if (parts[backlogIdx - 3] !== ".claude") return null;
  const root = parts.slice(0, backlogIdx - 3).join(path.sep);
  return root.length > 0 ? root : null;
}

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

// ---------------------------------------------------------------------------
// FEAT-250 SLICE-3 — slice-side construction (createSlice / updateSliceFrontmatter
// / moveSlice / listByState) + the acceptance-criteria helpers createSlice
// depends on (moved from slice-linker/feature-lifecycle.mts — see the module
// doc comment above for why).
// ---------------------------------------------------------------------------

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
  if (/^- \[[ x]\]/.test(line)) {
    return line.replace(/^- \[x\]/i, "- [ ]");
  }
  const acText = line.match(/^-\s+(.*\S)\s*$/)?.[1];
  if (acText && /^\*{0,2}(given\b|ac-\d+\b)/i.test(acText)) {
    return `- [ ] ${acText}`;
  }
  return null;
}

/**
 * Parses the `## Acceptance criteria` section from a FEAT body and returns
 * the criteria as unchecked checkbox lines. See {@link classifyAcceptanceCriteriaLine}
 * for the two accepted authoring formats. Stops at the next `##`-level
 * heading; a `### SN` per-slice subheading does not terminate the section.
 * See astragenie/runner-plugin#322, #370.
 */
export function extractAcceptanceCriteria(body: string): string[] {
  if (!body) return [];
  const lines = body.split("\n");
  let inSection = false;
  const results: string[] = [];
  for (const line of lines) {
    if (/^##\s+acceptance criteria\b/i.test(line.trim())) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
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
        "testable bullet under a `## Acceptance criteria` heading (qualifier suffixes " +
        "like `## Acceptance criteria (Given-When-Then)` are accepted; check for a typo'd " +
        "heading first) before a slice can be scaffolded. " +
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

const SLICE_FILE_RE = /^SLICE[-_](\d+)/;

// Walks slicesRoot recursively, returns the max numeric slice id found.
async function maxSliceIdUnder(dir: string): Promise<number> {
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

function sliceIdFor(n: number): string {
  return `SLICE-${String(n).padStart(2, "0")}`;
}

function kebab(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// WS-3: propagate the FEAT's canonical surface:*/stack:* tags down onto the
// slice frontmatter so `pickBuilderVariant` (dispatch.mts) — which reads
// `extractTags(sliceContent)`, i.e. the SLICE's own tags, not the FEAT's —
// resolves a real variant instead of falling through to "unknown". Only the
// canonical vocabulary propagates; other FEAT tags (concern:*, category
// labels, etc.) are dispatch-irrelevant and stay off the slice.
function propagatedSurfaceStackTags(featureTags: unknown): string[] {
  if (!Array.isArray(featureTags)) return [];
  return featureTags.filter(
    (t): t is string =>
      typeof t === "string" && (t.startsWith("surface:") || t.startsWith("stack:"))
  );
}

function deriveSliceTitleFromFeatureBody(featureBody: string, featureId: string): string {
  const titleLine = (featureBody || "").split("\n").find((l) => l.startsWith("# "));
  return titleLine ? titleLine.replace(/^#\s+[A-Z]+-\d+:\s*/, "").trim() : `Implement ${featureId}`;
}

// Normalizes a raw acceptance-criteria string (plain prose, a `- AC-N: ...`
// bullet, or a `- [ ]`/`- [x]` checkbox line) into the slice file's canonical
// `- [ ] ...` bullet form. Mirrors classifyAcceptanceCriteriaLine's checkbox
// handling but accepts any non-empty string, since proposed_slices'
// `acceptance_criteria` entries are PM-authored free text, not constrained to
// the FEAT body's heading-scoped bullet grammar.
function normalizeAcBullet(raw: string): string {
  const text = raw
    .trim()
    .replace(/^-\s*\[[ xX]\]\s*/, "")
    .replace(/^-\s+/, "");
  return `- [ ] ${text}`;
}

function buildSliceMarkdown({
  id,
  title,
  featureId,
  featureFrontmatter,
  featureBody,
  effortPoints,
  acceptanceCriteria,
  acWarning
}: {
  id: string;
  title: string;
  featureId: string;
  featureFrontmatter: Record<string, unknown>;
  featureBody: string;
  effortPoints?: number;
  acceptanceCriteria?: string[];
  acWarning?: string;
}): string {
  const today = nowIsoDate();
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
  const propagatedTags = propagatedSurfaceStackTags(featureFrontmatter.tags);
  if (propagatedTags.length > 0) {
    frontmatter.tags = propagatedTags;
  }
  const featureDescriptionLine = (featureBody || "")
    .split(/\n+/)
    .find((line) => line && !line.startsWith("#") && !line.startsWith("---"));

  // Per-slice ACs win when the proposed_slices entry carries its own
  // acceptance_criteria (QW4) — each sibling slice then claims only the
  // ACs it actually delivers instead of the whole FEAT's list. Otherwise
  // fall back to the FEAT-level ACs; the caller's assertAcceptanceCriteria
  // gate guarantees the FEAT body carries real ACs before we reach here, so
  // this only throws if a future caller bypasses that gate.
  const usingOwnAc = Array.isArray(acceptanceCriteria) && acceptanceCriteria.length > 0;
  const acLines = usingOwnAc
    ? acceptanceCriteria.map(normalizeAcBullet)
    : extractAcceptanceCriteria(featureBody);
  if (acLines.length === 0) {
    throw new AcceptanceCriteriaRequiredError(featureId);
  }
  const acSectionLines = !usingOwnAc && acWarning ? [acWarning, "", ...acLines] : acLines;

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
    ...acSectionLines,
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

export interface CreateSliceOpts {
  repoPath: string;
  featureId: string;
  featureFilePath: string;
  featureFrontmatter: Record<string, unknown>;
  featureBody: string;
  title?: string;
  effortPoints?: number;
  config?: Record<string, unknown> | null;
  // QW4: per-slice ACs from a proposed_slices entry's own acceptance_criteria
  // field, when the caller has one. Takes priority over featureBody's ACs.
  acceptanceCriteria?: string[];
  // QW4: visible AC-section warning line, injected only when acceptanceCriteria
  // is absent and the caller (materializeProposedSlices) determined this
  // slice's ACs are copied from the FEAT and shared across sibling slices.
  acWarning?: string;
}

export interface CreateSliceResult {
  id: string;
  filePath: string;
  title: string;
}

/**
 * Creates a slice file under `<slicesRoot>/pending/` from a feature. Allocates
 * the next SLICE id by scanning slicesRoot recursively for the current max.
 * `title` defaults to the feature body's H1 line (single-slice derivation);
 * pass it explicitly for the multi-slice (proposed_slices) path where the
 * title comes from the proposal, not the feature body. Subsumes what used to
 * be two near-duplicate call sites (materializeSingleSlice /
 * materializeProposedSlices in slice-linker/feature-lifecycle.mts) — one code
 * path for both.
 */
export async function createSlice(opts: CreateSliceOpts): Promise<CreateSliceResult> {
  const {
    repoPath,
    featureId,
    featureFrontmatter,
    featureBody,
    effortPoints,
    acceptanceCriteria,
    acWarning,
    config = null
  } = opts;
  const slicesRootDir = slicesRoot(repoPath, config);
  const maxId = await maxSliceIdUnder(slicesRootDir);
  const id = sliceIdFor(maxId + 1);
  const title = opts.title ?? deriveSliceTitleFromFeatureBody(featureBody, featureId);
  const sliceDir = path.join(slicesRootDir, "pending");
  await ensureDir(sliceDir);
  const slug = kebab(title);
  const filePath = path.join(sliceDir, `${id.replace("-", "_")}_${slug.toUpperCase()}.md`);
  assertStatePath(repoPath, config, filePath);
  const content = buildSliceMarkdown({
    id,
    title,
    featureId,
    featureFrontmatter,
    featureBody,
    ...(effortPoints !== undefined ? { effortPoints } : {}),
    ...(acceptanceCriteria !== undefined ? { acceptanceCriteria } : {}),
    ...(acWarning !== undefined ? { acWarning } : {})
  });
  await fs.writeFile(filePath, content);
  return { id, filePath, title };
}

export async function updateSliceFrontmatter(
  filePath: string,
  updates: Record<string, any>,
  repoPath?: string,
  config?: Record<string, any> | null
) {
  return mergeAndWriteFrontmatter(filePath, updates, repoPath, config);
}

// Shared merge+write+cache-bust primitive behind updateFeatureFrontmatter and
// updateSliceFrontmatter — same shape, different root, no behavior divergence
// today. Kept as two named exports (not one aliased function) so a future
// schema-validation divergence between features and slices has a natural
// seam to land in without touching call sites.
async function mergeAndWriteFrontmatter(
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
  clearFrontmatterCache();
  return parseFrontmatter(merged).frontmatter;
}

/**
 * Moves a slice file to `<slicesRoot>/<toState>/`, merging `updates` into its
 * frontmatter (plus `status: toState` and a fresh `updated` stamp) along the
 * way. Purely mechanical — unlike moveFeature, it does not infer lifecycle
 * timestamps (e.g. completed_at); callers that need idempotent lifecycle
 * stamping pass the field explicitly via `updates`. Subsumes
 * moveAndStampSlice's move-branch (complete-slice.mts) and
 * moveToNeedsReview (wave/failure-pivot.mts).
 */
export async function moveSlice(
  filePath: string,
  toState: string,
  updates: Record<string, any> = {},
  repoPath?: string,
  config?: Record<string, any> | null
) {
  const filename = path.basename(filePath);
  const fromDir = path.dirname(filePath);
  const targetDir = path.join(path.dirname(fromDir), toState);
  await ensureDir(targetDir);
  const targetPath = path.join(targetDir, filename);
  if (repoPath) {
    assertStatePath(repoPath, config, targetPath);
  }
  const content = await fs.readFile(filePath, "utf8");
  const merged = mergeFrontmatter(content, {
    ...updates,
    status: toState,
    updated: nowIsoDate()
  });
  await fs.writeFile(targetPath, merged);
  if (targetPath !== filePath) {
    await fs.unlink(filePath);
  }
  clearAll();
  clearFrontmatterCache();
  return { from: filePath, to: targetPath };
}

async function readSliceEntry(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const state = path.basename(path.dirname(filePath));
  return {
    id: (typeof frontmatter.id === "string" && frontmatter.id) || path.basename(filePath, ".md"),
    state,
    filePath,
    filename: path.basename(filePath),
    frontmatter: { ...frontmatter, status: state },
    body
  };
}

async function readSliceStateEntries(slicesRootDir: string, state: string) {
  const dir = path.join(slicesRootDir, state);
  if (!(await pathExists(dir))) return [];
  const files = await fs.readdir(dir);
  return Promise.all(
    files.filter((f) => f.endsWith(".md")).map((f) => readSliceEntry(path.join(dir, f)))
  );
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
