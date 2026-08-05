// Slice-lifecycle half of BacklogStore (FEAT-262 split of
// backlog-store.mts — see that file's barrel doc comment and DEC-076).
// createSlice, updateSliceFrontmatter, moveSlice, the slice-side of
// getById/listByState (composed in the barrel), and the acceptance-criteria
// helpers createSlice depends on are the original FEAT-250 SLICE-3 function
// bodies, moved verbatim. extractAcceptanceCriteria / AcceptanceCriteriaRequiredError
// / assertAcceptanceCriteria live here (not slice-linker/feature-lifecycle.mts)
// because createSlice's private buildSliceMarkdown helper needs them and this
// module cannot import slice-linker's submodules directly (validate-imports.mts
// boundary) — feature-lifecycle.mts re-exports these three names from the
// backlog-store barrel so no external import path changes.

import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter, mergeFrontmatter, serializeFrontmatter } from "../frontmatter.mjs";
import { pathExists, ensureDir, slicesRoot } from "../paths.mjs";
import { assertStatePath } from "../state-paths.mjs";
import { clearAll } from "../cache.mjs";
import { clearFrontmatterCache } from "../frontmatter-cache.mjs";
import { clampSliceTitle } from "../slice-title.mjs";
import { classifyRisk } from "../risk-classifier.mjs";
import type { FeatFrontmatterForRisk } from "../risk-classifier.mjs";
import { nowIsoDate, mergeAndWriteFrontmatter } from "./shared.mjs";
import { allocateNextSliceId, SLICE_FILE_RE } from "./slice-id-allocator.mjs";

/**
 * Classifies a single line inside the `## Acceptance criteria` section and
 * returns its normalized `- [ ] …` form, or `null` when the line isn't a
 * recognized criteria bullet. Extracted from {@link extractAcceptanceCriteria}
 * to keep that function's cognitive complexity under the biome cap.
 *
 * Accepts two authoring formats:
 * - `- [ ]` / `- [x]` checkbox bullets (normalized to unchecked)
 * - FEAT-277 inline-AC prose: `- GIVEN … WHEN … THEN …` or `- AC-N: …`
 *   bullets (optionally bold-prefixed). The `AC` marker accepts a hyphen,
 *   a space, or nothing before the number (`AC-1`, `AC 1`, `AC1`) — an LLM
 *   PM authors all three forms and the hyphen was never load-bearing
 *   (runner-plugin#475). A delimiter (`:`, `-`, or `—`) is required right
 *   after the number: without it, "AC1" is doing double duty as a plain
 *   English word start (e.g. "AC2000 legacy format", "AC42 is a system
 *   code, not a test") and must NOT be promoted to a testable criterion —
 *   the old hyphen-only form accidentally enforced this delimiter as a
 *   side effect of requiring the hyphen; removing the hyphen requirement
 *   without replacing the delimiter check reopened that hole.
 */
function classifyAcceptanceCriteriaLine(line: string): string | null {
  if (/^- \[[ x]\]/.test(line)) {
    return line.replace(/^- \[x\]/i, "- [ ]");
  }
  const acText = line.match(/^-\s+(.*\S)\s*$/)?.[1];
  if (acText && /^\*{0,2}(given\b|ac[-\s]?\d+\b\s*[:—-])/i.test(acText)) {
    return `- [ ] ${acText}`;
  }
  return null;
}

/**
 * Parses the `## Acceptance criteria` section from a FEAT body, returning
 * both the criteria (as unchecked checkbox lines) and whether the heading
 * itself was found. The `headingFound` flag lets callers distinguish "no
 * heading at all" from "heading present, zero bullets recognized" so
 * {@link AcceptanceCriteriaRequiredError} can point at the right problem
 * (runner-plugin#475). See {@link classifyAcceptanceCriteriaLine} for the
 * accepted authoring formats. Stops at the next `##`-level heading; a
 * `### SN` per-slice subheading does not terminate the section. See
 * astragenie/runner-plugin#322, #370.
 */
function extractAcceptanceCriteriaDetailed(body: string): {
  lines: string[];
  headingFound: boolean;
} {
  if (!body) return { lines: [], headingFound: false };
  const lines = body.split("\n");
  let inSection = false;
  let headingFound = false;
  const results: string[] = [];
  for (const line of lines) {
    if (/^##\s+acceptance criteria\b/i.test(line.trim())) {
      inSection = true;
      headingFound = true;
      continue;
    }
    if (!inSection) continue;
    if (/^##\s/.test(line)) break;
    const normalized = classifyAcceptanceCriteriaLine(line);
    if (normalized) results.push(normalized);
  }
  return { lines: results, headingFound };
}

/**
 * Parses the `## Acceptance criteria` section from a FEAT body and returns
 * the criteria as unchecked checkbox lines. Thin wrapper over
 * {@link extractAcceptanceCriteriaDetailed} for callers that only need the
 * bullets, not the heading-found flag.
 */
export function extractAcceptanceCriteria(body: string): string[] {
  return extractAcceptanceCriteriaDetailed(body).lines;
}

/**
 * Refuse to scaffold a slice from a FEAT with no PM-authored acceptance
 * criteria. Placeholder AC auto-generation was removed — the PM owns AC
 * authoring, and a missing `## Acceptance criteria` section is a hard error,
 * not a template-filled stub.
 *
 * `headingFound` (runner-plugin#475) distinguishes two failure modes that
 * used to share one misleading message: when the heading is genuinely
 * absent (or typo'd), the guidance to check the heading is correct and
 * stays. When the heading IS present but every bullet under it failed
 * classification, telling the author to hunt for a typo'd heading sends
 * them to the wrong place — the fix is in the bullet forms, not the
 * heading — so that case gets its own message naming the accepted bullet
 * forms instead.
 */
export class AcceptanceCriteriaRequiredError extends Error {
  constructor(
    public readonly featureId: string,
    public readonly headingFound: boolean = false
  ) {
    super(
      headingFound
        ? `${featureId} has a \`## Acceptance criteria\` heading, but none of the bullets under ` +
            "it were recognized as a testable criterion — the PM must author bullets in one of the " +
            "accepted forms: `- AC-1: ...`, `- AC1: ...`, `- AC 1: ...`, " +
            "`- GIVEN ... WHEN ... THEN ...`, or `- [ ] ...` / `- [x] ...` checkboxes (a plain " +
            "`- some note` bullet does not count) before a slice can be scaffolded. " +
            "Placeholder AC auto-generation was removed; run " +
            `\`/runner:triage --deep ${featureId}\` or \`/runner:pm-review ${featureId}\` to draft ACs.`
        : `${featureId} has no acceptance criteria — the PM must author at least one ` +
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
  const { lines, headingFound } = extractAcceptanceCriteriaDetailed(body);
  if (lines.length === 0) {
    throw new AcceptanceCriteriaRequiredError(featureId, headingFound);
  }
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

// Applies the simple, independent optional frontmatter fields (each a
// one-line presence check, no cross-field logic) — extracted from
// buildSliceMarkdown purely to keep its cognitive complexity under the
// Biome cap; no behavior change from having them inline.
function applyOptionalFrontmatterFields(
  frontmatter: Record<string, unknown>,
  {
    effortPoints,
    estimatedTokens,
    featureFrontmatter,
    touchesFiles,
    proposedSliceIdSuffix
  }: {
    effortPoints: number | undefined;
    estimatedTokens: number | undefined;
    featureFrontmatter: Record<string, unknown>;
    touchesFiles: string[] | undefined;
    proposedSliceIdSuffix: string | undefined;
  }
): void {
  if (typeof effortPoints === "number") {
    frontmatter.effort_points = effortPoints;
  }
  // SLICE-192: durable identity binding back to the `proposed_slices` entry
  // this slice was materialized from. Before this field existed, the only
  // way to tell which proposed entry a materialized slice corresponded to
  // was array position (existingSlices[i] <-> proposed[i]) — exactly the
  // assumption that breaks the moment a gap or out-of-order materialization
  // occurs (FEAT-284 live repro). Only set on the multi-slice
  // (proposed_slices) path — the single-slice path has no proposed entry to
  // bind to.
  if (typeof proposedSliceIdSuffix === "string" && proposedSliceIdSuffix.length > 0) {
    frontmatter.proposed_slice_id_suffix = proposedSliceIdSuffix;
  }
  // runner#393 proposal 4: carries the estimated_tokens computed/overridden
  // at proposed_slices parse time onto the materialized slice file, so a
  // human reading the slice can see the token-budget signal that gated it.
  if (typeof estimatedTokens === "number") {
    frontmatter.estimated_tokens = estimatedTokens;
  }
  const propagatedTags = propagatedSurfaceStackTags(featureFrontmatter.tags);
  if (propagatedTags.length > 0) {
    frontmatter.tags = propagatedTags;
  }
  // FEAT-276 AC-4: declare touches_files at creation time when the caller
  // resolved a real value (FEAT-level touches_files for the single-slice
  // path, or a proposed_slices entry's own touches_files for the multi-slice
  // path) — see feature-lifecycle.mts's two call sites for the precedence
  // rules. Never fabricated here; an absent/empty value is a silent no-op,
  // same as today (falls through to the wave planner's inferred/missing
  // tiers in touches-files.mts).
  if (Array.isArray(touchesFiles) && touchesFiles.length > 0) {
    frontmatter.touches_files = touchesFiles;
  }
}

function buildSliceMarkdown({
  id,
  title,
  featureId,
  featureFrontmatter,
  featureBody,
  effortPoints,
  estimatedTokens,
  acceptanceCriteria,
  acWarning,
  touchesFiles,
  proposedSliceIdSuffix
}: {
  id: string;
  title: string;
  featureId: string;
  featureFrontmatter: Record<string, unknown>;
  featureBody: string;
  effortPoints?: number;
  estimatedTokens?: number;
  acceptanceCriteria?: string[];
  acWarning?: string;
  touchesFiles?: string[];
  proposedSliceIdSuffix?: string;
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
  applyOptionalFrontmatterFields(frontmatter, {
    effortPoints,
    estimatedTokens,
    featureFrontmatter,
    touchesFiles,
    proposedSliceIdSuffix
  });
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
  const featureAcDetail = usingOwnAc ? null : extractAcceptanceCriteriaDetailed(featureBody);
  const acLines = usingOwnAc
    ? acceptanceCriteria.map(normalizeAcBullet)
    : (featureAcDetail?.lines ?? []);
  if (acLines.length === 0) {
    throw new AcceptanceCriteriaRequiredError(featureId, featureAcDetail?.headingFound ?? false);
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
  estimatedTokens?: number;
  config?: Record<string, unknown> | null;
  // QW4: per-slice ACs from a proposed_slices entry's own acceptance_criteria
  // field, when the caller has one. Takes priority over featureBody's ACs.
  acceptanceCriteria?: string[];
  // QW4: visible AC-section warning line, injected only when acceptanceCriteria
  // is absent and the caller (materializeProposedSlices) determined this
  // slice's ACs are copied from the FEAT and shared across sibling slices.
  acWarning?: string;
  // FEAT-276 AC-4: already-resolved declared touch surface for this slice —
  // caller decides the source (FEAT-level `touches_files` for a single-slice
  // FEAT, or one proposed_slices entry's own `touches_files` for a sibling
  // slice). createSlice performs no inference of its own.
  touchesFiles?: string[];
  // SLICE-192: the `proposed_slices` entry's own `id_suffix` (e.g.
  // `-SLICE-2`) this slice was materialized from — the durable identity
  // binding the multi-slice materializer keys off instead of array position.
  // Absent on the single-slice path (no proposed entry to bind to).
  proposedSliceIdSuffix?: string;
}

export interface CreateSliceResult {
  id: string;
  filePath: string;
  title: string;
}

/**
 * Creates a slice file under `<slicesRoot>/pending/` from a feature. Allocates
 * the next SLICE id via {@link allocateNextSliceId} — a local slicesRoot scan
 * combined with a best-effort remote origin/main scan (DEC-079) — so two
 * worktrees minting a slice from the same base commit are less likely to
 * collide on the same id.
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
    estimatedTokens,
    acceptanceCriteria,
    acWarning,
    touchesFiles,
    proposedSliceIdSuffix,
    config = null
  } = opts;
  const slicesRootDir = slicesRoot(repoPath, config);
  const nextId = await allocateNextSliceId(repoPath, slicesRootDir, config);
  const id = sliceIdFor(nextId);
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
    ...(estimatedTokens !== undefined ? { estimatedTokens } : {}),
    ...(acceptanceCriteria !== undefined ? { acceptanceCriteria } : {}),
    ...(acWarning !== undefined ? { acWarning } : {}),
    ...(touchesFiles !== undefined ? { touchesFiles } : {}),
    ...(proposedSliceIdSuffix !== undefined ? { proposedSliceIdSuffix } : {})
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

// Exported (rather than module-private) so the backlog-store.mts barrel can
// compose getById/listByState across both the feature and slice sides — the
// barrel lives inside this module's import boundary (validate-imports.mts),
// so this is not a boundary bypass; it is the composition point the
// boundary is designed to allow.
/**
 * Renames a slice markdown file in place — same directory/state, new
 * `SLICE_NN`-prefixed basename plus a matching `id:` frontmatter field.
 * Sole consumer is the FEAT-257/DEC-079 slice-renumber CLI
 * (`src/scripts/lib/slice-renumber.mts`), remediating the residual
 * allocation-race collision (two worktrees minting the same id before
 * either pushes). Kept inside BacklogStore rather than a raw `fs.rename` in
 * the CLI module so the DEC-076 sole-writer invariant for SLICE files holds
 * even for this rare corrective path. Mints no new lifecycle state — just
 * the id-bearing basename + frontmatter `id` field; the caller is
 * responsible for renaming sibling artifacts and updating the owning FEAT.
 */
export async function renameSliceId(
  filePath: string,
  toId: string,
  repoPath?: string,
  config?: Record<string, any> | null
): Promise<{ from: string; to: string }> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const newBase = base.replace(SLICE_FILE_RE, toId.replace("-", "_"));
  const targetPath = path.join(dir, newBase);
  if (repoPath) {
    assertStatePath(repoPath, config, targetPath);
  }
  const content = await fs.readFile(filePath, "utf8");
  const merged = mergeFrontmatter(content, { id: toId, updated: nowIsoDate() });
  await fs.writeFile(targetPath, merged);
  if (targetPath !== filePath) {
    await fs.unlink(filePath);
  }
  clearAll();
  clearFrontmatterCache();
  return { from: filePath, to: targetPath };
}

export async function readSliceEntry(filePath: string) {
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

export async function readSliceStateEntries(slicesRootDir: string, state: string) {
  const dir = path.join(slicesRootDir, state);
  if (!(await pathExists(dir))) return [];
  const files = await fs.readdir(dir);
  return Promise.all(
    files.filter((f) => f.endsWith(".md")).map((f) => readSliceEntry(path.join(dir, f)))
  );
}
