import fs from "node:fs/promises";
import { resolveConfig } from "../config-resolver.mjs";
import { parseFrontmatter } from "../frontmatter.mjs";
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
  SliceAlreadyShippedError
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
  if (reconcile.shipped.length === 0) return undefined;

  const action = planReconcileAction(proposed.length, existingCount, reconcile.shipped);
  if (action.kind === "refuse") {
    throw new SliceAlreadyShippedError(featureId, reconcile.shipped, action.reason);
  }
  if (action.kind === "proceed") return undefined;

  // action.kind === "advance" — durably stamp the evidence before returning
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
  const created = await createSlice({
    repoPath,
    featureId,
    featureFilePath,
    featureFrontmatter: featureFM,
    featureBody,
    config
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
  // pass — set when a contiguous shipped prefix was detected beyond what
  // `featureFM.slices` records. `Math.max`'d against existingSlices.length
  // below so it can only ever skip forward, never re-materialize something
  // already tracked.
  startIndex?: number;
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

  const existingSlices = Array.isArray(featureFM.slices) ? featureFM.slices : [];
  const startAt = Math.max(existingSlices.length, opts.startIndex ?? 0);

  // Idempotent rerun: if the feature already has at least as many slices
  // as proposed entries, do nothing further. Materialized slice files are
  // recorded on `slices`; their paths are recoverable by the caller via
  // the locate helpers if needed.
  if (startAt >= proposed.length) {
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

  const toCreate = proposed.slice(startAt);
  const newSlices: { id: string; path: string; title: string; points: number }[] = [];

  // A FEAT-level AC copy is only misleading when there are 2+ sibling
  // slices to split scope across — a lone proposed_slices entry legitimately
  // owns the whole FEAT's ACs, same as the single-slice path.
  const isSharedAcRisk = proposed.length >= 2;

  // Sequential, not parallel: each createSlice call allocates its next id by
  // scanning slicesRoot for the current max, so the previous iteration's
  // write must land on disk before the next allocates.
  for (const item of toCreate) {
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
      ...(ownAc ? { acceptanceCriteria: ownAc } : {}),
      ...(warnSharedAc
        ? {
            acWarning:
              `> WARNING: ACs copied from ${featureId} and shared across ${proposed.length} ` +
              "sibling slices — scope per-slice before close"
          }
        : {}),
      config
    });
    newSlices.push({
      id: created.id,
      path: created.filePath,
      title: created.title,
      points: item.points
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
