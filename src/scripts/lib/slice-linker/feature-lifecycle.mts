import fs from "node:fs/promises";
import { resolveConfig } from "../config-resolver.mjs";
import { parseFrontmatter } from "../frontmatter.mjs";
import { slicesRoot, locateSliceFile } from "../paths.mjs";
import { findFeatureById, moveFeature, updateFeatureFrontmatter } from "../backlog-writer.mjs";
import {
  createSlice,
  updateSliceFrontmatter,
  extractAcceptanceCriteria,
  AcceptanceCriteriaRequiredError,
  assertAcceptanceCriteria
} from "../backlog-store.mjs";
import { parseProposedSlices, type ProposedSlice } from "../proposed-slices.mjs";
import { parseClassifyOutput } from "../classify-parser.mjs";
import { writeFeatureEndCeremony } from "../ceremonies.mjs";
import type { DispatchOpts, DispatchResult } from "../auto-dispatch.mjs";
import { assertSized } from "../proposed-slices.mjs";
import { gitTextOrThrow } from "../run-git.mjs";
import {
  reconcileProposedSlicesAgainstGit,
  planReconcileAction,
  SliceAlreadyShippedError,
  type TextOnlyMatchEvidence,
  type TextOnlyMatchReason,
  type ShippedOrdinalEvidence
} from "./git-anchored-completion.mjs";

// Re-exported so CLI handlers (loop.mts) can catch it alongside
// DecompositionRequiredError/InvalidProposedSlicesError/AcceptanceCriteriaRequiredError.
export { SliceAlreadyShippedError };

// Re-exported for slice-linker.mjs barrel + existing direct importers — moved
// to backlog-store.mts (FEAT-250 SLICE-3) because createSlice's private
// buildSliceMarkdown helper needs them and backlog-store.mts lives outside
// slice-linker/, where the validate-imports.mts boundary forbids the reverse
// import. See backlog-store.mts's module doc comment.
export { extractAcceptanceCriteria, AcceptanceCriteriaRequiredError, assertAcceptanceCriteria };

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

// Mirror of classify-parser's ClassifyResult — kept local to avoid a circular
// `import type` from a sibling lib module. Stack / surface are deliberately
// absent: preset-driven skill activation (each repo's own `.claude/loop.json`,
// inlined from a `scripts/presets/*.json` install-time template — DEC-069) is
// the sole source of project-level stack identity.
type ClassifyResult = {
  tags: string[];
  needs_contract: boolean | null;
  needs_ux: boolean | null;
};

// FEAT-276 AC-4: normalizes a FEAT's raw frontmatter `touches_files` value
// (only meaningful for the single-slice path, where the lone materialized
// slice IS the whole FEAT's scope — a 1:1 mapping, unlike the multi-slice
// path where the FEAT-level list would over-declare every sibling slice and
// create false wave-planner conflicts). Mirrors the shape guard already
// applied to `proposed_slices[].touches_files` in proposed-slices.mts, kept
// local here since it operates on unknown FEAT frontmatter, not a typed
// ProposedSlice.
function normalizeFeatureTouchesFiles(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const paths = raw.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return paths.length > 0 ? paths : undefined;
}

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
  config = null,
  dispatchFn
}: {
  repoPath: string;
  slicePath: string;
  featureFM: Record<string, unknown>;
  noClassify: boolean;
  config?: Record<string, unknown> | null;
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
        await updateSliceFrontmatter(slicePath, updates, repoPath, config);
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

// FEAT-284 SLICE-190: human-readable form of each TextOnlyMatchReason, for
// the operator-facing warning lines below — see TextOnlyMatchReason's own
// doc comment in git-anchored-completion.mts for what each discriminator
// actually checked.
const TEXT_ONLY_REASON_LABEL: Record<TextOnlyMatchReason, string> = {
  "token-pair-in-body-only":
    "the FEAT/SLICE reference appears only in the commit body, not its subject",
  "no-diff-evidence": "the commit changed no files",
  "no-touches-files-overlap":
    "the commit's changed files don't overlap this slice's declared touches_files",
  "non-implementing-paths-only":
    "the commit only touched non-implementing paths (docs/backlog artifacts)"
};

// FEAT-284 AC-3: git-anchored-completion.mts is a pure evaluator (see its
// module doc comment) — it hands back `textOnlyMatches` but never prints
// anything itself. This is the one caller that both makes the reconcile
// decision and has an operator watching (devcrew:start / slice from-feature),
// so it owns surfacing the two situations a reconcile pass can produce:
//
//   - demoted: a commit's text matched a proposed slice's FEAT-id/SLICE-
//     ordinal pair, but the diff didn't corroborate it (or the pair was
//     body-only) — the slice is treated as unshipped and will be
//     (re)materialized. This is what the FEAT-284 incident's repair
//     (`c2e77fe7`) and SLICE-188's own fixture commit (`3bd6ab95`) look like
//     under the corrected matcher: real evidence the check saw and declined
//     to act on, which is silent unless printed here.
//   - skipped: a contiguous shipped prefix is advancing the start index —
//     these proposed slices are being treated as already shipped and will
//     NOT be materialized. This is the exact path that silently dropped
//     FEAT-259's SLICE-1 via commit `71604bb4`; it must announce itself even
//     though it's the success path, not just on failure.
//
// No-op (prints nothing) when the respective list is empty — a clean
// reconcile pass must stay silent, not emit "0 warnings" noise.
function logDemotedMatches(featureId: string, textOnlyMatches: TextOnlyMatchEvidence[]): void {
  if (textOnlyMatches.length === 0) return;
  console.warn(
    `[git-anchored-completion] ${featureId}: ${textOnlyMatches.length} proposed slice(s) ` +
      "demoted to a warning — text matched but not corroborated as shipped:"
  );
  for (const m of textOnlyMatches) {
    console.warn(
      `  - ordinal ${m.ordinal} (${m.idSuffix} "${m.title}") — commit ${m.commitSha.slice(0, 7)} ` +
        `"${m.commitSubject}": ${TEXT_ONLY_REASON_LABEL[m.reason]}. Treating as unshipped; ` +
        "will be materialized."
    );
  }
}

function logSkippedShipped(featureId: string, skipped: ShippedOrdinalEvidence[]): void {
  if (skipped.length === 0) return;
  console.warn(
    `[git-anchored-completion] ${featureId}: ${skipped.length} proposed slice(s) skipped as ` +
      "already-shipped (start index advances past them):"
  );
  for (const s of skipped) {
    console.warn(
      `  - ordinal ${s.ordinal} (${s.idSuffix} "${s.title}") — matched commit ` +
        `${s.commitSha.slice(0, 7)} "${s.commitSubject}"`
    );
  }
}

// runner-plugin#392: run the git-anchored reconcile pass for a FEAT's
// proposed_slices decomposition and translate the verdict into a
// materializeProposedSlices `startIndex` override.
//
// Returns:
//   - `undefined` when there's nothing to reconcile (all proposed slices
//     already materialized, or no shipped evidence found) — the caller
//     falls back to its normal existingSlices.length-based start index.
//   - a number (0-indexed) when a contiguous shipped prefix was detected
//     and safely auto-reconciled — also durably stamps the evidence onto
//     the FEAT frontmatter (proposed_slices_shipped / _commits) so the
//     finding survives a fresh checkout, per the state-survival AC.
//
// Throws SliceAlreadyShippedError when the FEAT looks fully shipped or the
// evidence is non-contiguous (ambiguous — refuse rather than reorder).
// Never throws on a git-level failure — reconcileProposedSlicesAgainstGit's
// own gitError signal is treated as "no evidence" (fail-open).
async function reconcileProposedSlicesStartIndex(
  repoPath: string,
  featureId: string,
  featureFilePath: string,
  sourceFM: Record<string, any>,
  proposed: ProposedSlice[],
  config: Record<string, any> | null
): Promise<number | undefined> {
  const existingSlicesRaw: string[] = Array.isArray(sourceFM.slices) ? sourceFM.slices : [];
  const existingCount = Math.min(existingSlicesRaw.length, proposed.length);
  if (existingCount >= proposed.length) return undefined; // already fully materialized

  const reconcile = await reconcileProposedSlicesAgainstGit(repoPath, featureId, proposed, config);
  if (reconcile.gitError) {
    // Fail-open: log for operator visibility, never block the start.
    console.warn(
      `[git-anchored-completion] ${featureId}: ${reconcile.gitError} — proceeding unchecked.`
    );
    return undefined;
  }
  // FEAT-284 AC-3: a demoted match is worth surfacing regardless of what the
  // reconcile action below turns out to be — it's evidence the check saw and
  // declined to act on, independent of whether any ordinal ends up skipped.
  logDemotedMatches(featureId, reconcile.textOnlyMatches);

  if (reconcile.shipped.length === 0) return undefined;

  const action = planReconcileAction(proposed.length, existingCount, reconcile.shipped);
  if (action.kind === "refuse") {
    // SliceAlreadyShippedError's own message already lists each shipped
    // ordinal/commit — no separate skip line needed for a refuse.
    throw new SliceAlreadyShippedError(featureId, reconcile.shipped, action.reason);
  }
  if (action.kind === "proceed") return undefined;

  // action.kind === "advance": every entry in reconcile.shipped is part of
  // the contiguous prefix being skipped (planReconcileAction already refused
  // above if any shipped ordinal fell outside it) — this is the silent-drop
  // path from the FEAT-284 incident, so it must announce itself even though
  // it's succeeding, not failing.
  logSkippedShipped(featureId, reconcile.shipped);

  // Durably stamp the evidence before returning
  // the override, so the finding survives a fresh checkout / worktree even
  // if the caller's subsequent materialize step never runs. The stamp is an
  // audit trail, not a gate: an fs failure here must not block the start
  // (same fail-open contract as the git checks above) — the advance verdict
  // stands either way, it just won't survive a fresh checkout.
  try {
    await updateFeatureFrontmatter(featureFilePath, {
      proposed_slices_shipped: reconcile.shipped.map((s) => s.idSuffix),
      proposed_slices_shipped_commits: reconcile.shipped.map((s) => s.commitSha)
    });
  } catch (err: unknown) {
    console.warn(
      `[git-anchored-completion] ${featureId}: failed to stamp shipped-slice evidence on ` +
        `${featureFilePath} (${err instanceof Error ? err.message : String(err)}) — advancing anyway.`
    );
  }
  return action.newStartIndex;
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

  // runner-plugin#392: git-anchored completion check. Cross-check the
  // proposed_slices decomposition against merged commit history BEFORE the
  // in-progress move, so a refuse (SliceAlreadyShippedError) leaves backlog
  // state untouched — same ordering rationale as the AC gate above. Only
  // applies to the multi-slice (proposed_slices) path: that's where
  // `sliceFromFeature` picks `proposed[existingCount]` by index, the exact
  // mechanism that silently re-scaffolds shipped work when the FEAT's
  // `slices` frontmatter has drifted from git reality. Fail-open by
  // contract — a git error never blocks a legitimate start.
  const gitReconciledStartIndex =
    proposed && proposed.length > 0
      ? await reconcileProposedSlicesStartIndex(
          repoPath,
          featureId,
          entry.filePath,
          sourceFM,
          proposed,
          resolved
        )
      : undefined;

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
      config: resolved,
      ...(gitReconciledStartIndex !== undefined ? { startIndex: gitReconciledStartIndex } : {})
    });
  }

  return await materializeSingleSlice({
    repoPath,
    featureId,
    featureFilePath,
    featureFM,
    featureBody,
    movedFromState,
    config: resolved,
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
  config: Record<string, any> | null;
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
    config,
    noClassify = false,
    dispatchFn
  } = opts;

  // Title defaults to the feature body's H1 line when not supplied —
  // createSlice's own derivation, identical to what this call site computed
  // inline before the FEAT-250 SLICE-3 consolidation.
  const touchesFiles = normalizeFeatureTouchesFiles(featureFM.touches_files);
  const created = await createSlice({
    repoPath,
    featureId,
    featureFilePath,
    featureFrontmatter: featureFM,
    featureBody,
    config,
    ...(touchesFiles ? { touchesFiles } : {})
  });

  const classifyResult = await classifySlice({
    repoPath,
    slicePath: created.filePath,
    featureFM,
    noClassify,
    config,
    ...(dispatchFn !== undefined ? { dispatchFn } : {})
  });

  const existingSlices = Array.isArray(featureFM.slices) ? featureFM.slices : [];
  if (!existingSlices.includes(created.id)) {
    await updateFeatureFrontmatter(featureFilePath, {
      slices: [...existingSlices, created.id]
    });
  }

  const sliceInfo = { id: created.id, path: created.filePath, title: created.title };
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
  config: Record<string, any> | null;
  // runner-plugin#392: 0-indexed override from the git-anchored reconcile
  // pass — set when a contiguous shipped prefix (ordinals 1..k, positions
  // 0..k-1) was found in merged git history beyond what's already
  // materialized. SLICE-192: this is still a POSITION-based signal by
  // design (git evidence is inherently about ordinals, not materialized
  // slice ids) — every `proposed` entry at index < startIndex is treated as
  // shipped-per-git and is never (re)materialized locally, regardless of
  // whether a local slice file happens to exist for it. This is orthogonal
  // to, and composes with, the identity-keyed matching below: startIndex
  // narrows which ordinals are even candidates for creation; identity
  // matching then decides which of the remaining candidates already have a
  // real materialized slice.
  startIndex?: number;
}

// SLICE-192: the durable identity signal a materialized slice carries back
// to the `proposed_slices` entry it came from. Two sources, checked in
// order:
//   1. `proposed_slice_id_suffix` frontmatter (see slice-store.mts) —
//      stamped by this module on every slice it creates from here on. The
//      authoritative signal going forward.
//   2. Exact title match against a proposed entry. This is the ONLY
//      identity signal available for slices materialized before this field
//      existed (the live FEAT-259/FEAT-284 data) — there is no other
//      durable binding on disk. It works because proposed-slices.mts caps
//      `title` at 100 chars, under slice-title.mts's SLICE_TITLE_MAX (120),
//      so createSlice's clampSliceTitle never alters it: the slice
//      frontmatter's `title` is byte-for-byte the proposed entry's title.
//      This is a content match, not a position/index guess — it degrades
//      to "unknown" (not a wrong answer) when titles were authored
//      identically across siblings or hand-edited post-creation.
// Returns undefined when neither signal identifies the slice — the caller
// then can't rule out that this materialized slice IS some proposed entry,
// but also can't prove which one, so it's excluded from the identity map
// rather than guessed.
function matchProposedIdSuffix(
  sliceFrontmatter: Record<string, unknown>,
  proposed: ProposedSlice[]
): string | undefined {
  const stamped = sliceFrontmatter.proposed_slice_id_suffix;
  if (typeof stamped === "string" && stamped.length > 0) return stamped;
  const title = sliceFrontmatter.title;
  if (typeof title !== "string" || title.length === 0) return undefined;
  return proposed.find((p) => p.title === title)?.id_suffix;
}

// SLICE-192: scans every already-materialized slice id on the FEAT
// (`existingSlices`) and resolves which `proposed_slices` entry (by
// `id_suffix`) it corresponds to, via `matchProposedIdSuffix`. Replaces the
// old `existingSlices[i] <-> proposed[i]` positional pairing, which breaks
// the moment a gap or out-of-order materialization occurs (the FEAT-284
// live repro — see this module's other comments). A slice file that can't
// be located, or whose identity can't be resolved, is silently skipped —
// it contributes nothing to the map rather than a wrong entry.
async function resolveMaterializedIdSuffixes(
  repoPath: string,
  config: Record<string, any> | null,
  existingSlices: string[],
  proposed: ProposedSlice[]
): Promise<Map<string, string>> {
  const slicesRootDir = slicesRoot(repoPath, config);
  const bySuffix = new Map<string, string>();
  for (const sliceId of existingSlices) {
    const filePath = await locateSliceFile(slicesRootDir, sliceId);
    if (!filePath) continue;
    let frontmatter: Record<string, unknown>;
    try {
      const content = await fs.readFile(filePath, "utf8");
      frontmatter = parseFrontmatter(content).frontmatter;
    } catch {
      continue;
    }
    const idSuffix = matchProposedIdSuffix(frontmatter, proposed);
    if (idSuffix && !bySuffix.has(idSuffix)) {
      bySuffix.set(idSuffix, sliceId);
    }
  }
  return bySuffix;
}

// Resolves the optional createSlice() extras for one proposed_slices entry
// — extracted from materializeProposedSlices's per-item loop purely to keep
// that function's cognitive complexity under the Biome cap; no behavior
// change from having these three conditional spreads inline.
function resolveProposedSliceCreateExtras(
  item: ProposedSlice,
  ownAc: string[] | undefined,
  warnSharedAc: boolean,
  featureId: string,
  siblingCount: number
): { acceptanceCriteria?: string[]; acWarning?: string; touchesFiles?: string[] } {
  return {
    ...(ownAc ? { acceptanceCriteria: ownAc } : {}),
    ...(warnSharedAc
      ? {
          acWarning:
            `> WARNING: ACs copied from ${featureId} and shared across ${siblingCount} ` +
            "sibling slices — scope per-slice before close"
        }
      : {}),
    // FEAT-276 AC-4: per-slice touches_files, when this proposal entry
    // declared its own — never falls back to the FEAT-level list (see
    // normalizeFeatureTouchesFiles's docstring for why that would be unsafe
    // across siblings).
    ...(item.touches_files && item.touches_files.length > 0
      ? { touchesFiles: item.touches_files }
      : {})
  };
}

interface ProposedSliceStatus {
  item: ProposedSlice;
  index: number;
  // The real materialized slice id, when identity-matched — see
  // matchProposedIdSuffix. undefined means "no local slice file is known to
  // correspond to this proposed entry" (either genuinely missing, or only
  // covered by the git-anchored startIndex below).
  materializedId: string | undefined;
  coveredByStartIndex: boolean;
}

// SLICE-192: per-proposed-entry status, combining the two independent
// signals that can mark an entry as "don't create this": an identity-matched
// local slice file, or the git-anchored startIndex prefix (see
// MaterializeMultiOpts.startIndex's doc comment for why these compose
// rather than collapse into one check).
function resolveProposedSliceStatuses(
  proposed: ProposedSlice[],
  materializedBySuffix: Map<string, string>,
  startIndex: number
): ProposedSliceStatus[] {
  return proposed.map((item, index) => ({
    item,
    index,
    materializedId: materializedBySuffix.get(item.id_suffix),
    coveredByStartIndex: index < startIndex
  }));
}

async function materializeProposedSlices(opts: MaterializeMultiOpts) {
  const {
    repoPath,
    featureId,
    featureFilePath,
    featureFM,
    featureBody,
    movedFromState,
    proposed,
    config
  } = opts;

  const existingSlices: string[] = Array.isArray(featureFM.slices) ? featureFM.slices : [];
  const startIndex = Math.max(0, opts.startIndex ?? 0);
  const materializedBySuffix = await resolveMaterializedIdSuffixes(
    repoPath,
    config,
    existingSlices,
    proposed
  );
  const statuses = resolveProposedSliceStatuses(proposed, materializedBySuffix, startIndex);
  const toCreate = statuses.filter((s) => s.materializedId === undefined && !s.coveredByStartIndex);

  // Idempotent rerun: every proposed entry is either already materialized
  // (identity-matched to a real slice file) or covered by the git-anchored
  // startIndex prefix — nothing left to create. SLICE-192: unlike the old
  // `existingSlices.length >= proposed.length` count check, this holds even
  // when a gap was filled out of order or a middle entry was created after
  // its siblings, because each entry's status is resolved independently by
  // identity rather than by a contiguous positional cursor.
  if (toCreate.length === 0) {
    const slicesInfo = statuses
      .filter((s) => s.materializedId !== undefined)
      .map((s) => ({
        id: s.materializedId!,
        path: null as string | null,
        title: s.item.title,
        points: s.item.points,
        estimatedTokens: s.item.estimated_tokens
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

  const newSlices: {
    id: string;
    path: string;
    title: string;
    points: number;
    estimatedTokens: number;
  }[] = [];

  // A FEAT-level AC copy is only misleading when there are 2+ sibling
  // slices to split scope across — a lone proposed_slices entry legitimately
  // owns the whole FEAT's ACs, same as the single-slice path.
  const isSharedAcRisk = proposed.length >= 2;

  // Sequential, not parallel: each createSlice call allocates its next id by
  // scanning slicesRoot for the current max, so the previous iteration's
  // write must land on disk before the next allocates. Iterates `toCreate`
  // in ascending proposed-entry order (statuses/filter preserve `proposed`'s
  // order) — a gap at ordinal 1 with ordinals 2-5 already materialized
  // creates only ordinal 1, in its own right position, never a duplicate of
  // 2-5 (FEAT-284 SLICE-192).
  for (const status of toCreate) {
    const item = status.item;
    const ownAc =
      Array.isArray(item.acceptance_criteria) && item.acceptance_criteria.length > 0
        ? item.acceptance_criteria
        : undefined;
    const warnSharedAc = !ownAc && isSharedAcRisk;
    if (warnSharedAc) {
      console.warn(
        `[slice-linker] ${featureId} ${item.id_suffix}: no acceptance_criteria on this ` +
          `proposed_slices entry — copying FEAT-level ACs across ${proposed.length} sibling ` +
          "slices. Scope this slice's AC section before close."
      );
    }
    const created = await createSlice({
      repoPath,
      featureId,
      featureFilePath,
      featureFrontmatter: featureFM,
      featureBody,
      title: item.title,
      effortPoints: item.points,
      estimatedTokens: item.estimated_tokens,
      proposedSliceIdSuffix: item.id_suffix,
      ...resolveProposedSliceCreateExtras(item, ownAc, warnSharedAc, featureId, proposed.length),
      config
    });
    newSlices.push({
      id: created.id,
      path: created.filePath,
      title: created.title,
      points: item.points,
      estimatedTokens: item.estimated_tokens
    });
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
    const { stdout } = await gitTextOrThrow(args, { cwd: repoPath, timeoutMs: 30_000 });
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
