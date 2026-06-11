import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig } from "../config-resolver.mjs";
import { readGradeTrend, checkGradeTrend, checkMarathonMilestone } from "../grade-trend.mjs";
import { lintAcceptanceCriteria } from "../ac-linter.mjs";
import { writeCrewRunBrief } from "./crew-bridge.mjs";
import { findActivePlan, detectSliceStatus, writeSliceProgress } from "./slice-progress.mjs";
import { slicesRoot as resolveSlicesRoot } from "../paths.mjs";
import { readSliceContext, readFeatureExcerpt, buildDispatchInstruction } from "./dispatch.mjs";
import type { OrchestratorMode } from "./dispatch.mjs";
import { recentLearnings } from "../learnings.mjs";
import { resolveOrchestratorModel } from "../model-router.mjs";
import { runPlanPreflight } from "../slice-plan.mjs";
import { findFeatureById } from "../backlog-writer.mjs";
import { detectAcceptanceCriteria } from "../backlog-triage.mjs";
import { computeConfidence } from "../confidence-signal.mjs";
import { checkOrchestrateSliceSupport } from "../plugin-identity.mjs";
import { writeSessionIdToWorkflowState } from "../session-drift.mjs";
import { ensureSliceWorktree } from "../worktree-manager.mjs";
import type { WorktreeResult } from "../worktree-manager.mjs";
import { mergeFrontmatter } from "../frontmatter.mjs";
import { displaySliceTitle } from "../slice-title.mjs";
import { classifySliceShape } from "../classify-slice-shape.mjs";
import type { FileChange } from "../classify-slice-shape.mjs";
import { writeShapeMarker } from "../shape-marker.mjs";

// ---------------------------------------------------------------------------
// SLICE-94 / FEAT-186: shape classification helpers
// ---------------------------------------------------------------------------

/** Parse the "## Files" section from slice content into FileChange[]. */
function parseSliceFiles(content: string | null): FileChange[] {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => /^##\s+Files\s*$/i.test(l));
  if (startIdx === -1) return [];
  const paths: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (/^##\s+/.test(line)) break;
    const trimmed = line.replace(/^[-*]\s*/, "").trim();
    if (trimmed.length > 0) paths.push(trimmed);
  }
  return paths.map((p) => ({ path: p, added: 0, removed: 0, exportDelta: 0 }));
}

/** Resolve whether the inline path is recommended for a given shape + config. */
function resolveInlinePath(
  shape: string,
  dispatchLimits: { preferInlineFor?: string[]; expandedInlineCriteria?: boolean } | null
): boolean {
  if (!dispatchLimits) return false;
  const expanded = dispatchLimits.expandedInlineCriteria !== false;
  const preferred = dispatchLimits.preferInlineFor ?? [];
  return expanded && preferred.includes(shape) && shape !== "none";
}

/** Run classify-slice-shape, write marker (best-effort), return inline-path hint string or null. */
async function applyShapeClassification(
  repoPath: string,
  sliceId: string,
  sliceContent: string | null,
  dispatchLimits: { preferInlineFor?: string[]; expandedInlineCriteria?: boolean } | null
): Promise<string | null> {
  const files = parseSliceFiles(sliceContent);
  const { shape, rationale } = classifySliceShape({ files });
  const inlinePath = resolveInlinePath(shape, dispatchLimits);
  void writeShapeMarker(repoPath, sliceId, shape, rationale, inlinePath);
  if (!inlinePath) return null;
  return `inline-path recommended (shape: ${shape}, rationale: ${rationale}) — orchestrator may skip dispatched specialists for tightly-scoped slices when other gates can be lead-attested per docs/sop/inline-criteria.md.`;
}

function computeRecentGradeAvg(scores: Array<{ sliceId: string; avg: number }>): number | null {
  if (!scores || scores.length === 0) return null;
  const recent = scores.slice(-3);
  return recent.reduce((sum, s) => sum + s.avg, 0) / recent.length;
}

// Pick the orchestrator mode emitted in dispatchInstruction. Precedence:
//   1. config.loop.orchestratorMode (explicit)
//   2. "lead" by default — crew:lead orchestrates the slice ceremony.
// The legacy `useOrchestrateSlice` boolean is retained as fallback for callers
// that pre-date the config option: if no explicit mode is set and the boolean
// is true, emit the /crew:orchestrate-slice path; otherwise legacy direct-builder.
function resolveOrchestratorModeConfig(
  config: Record<string, any>,
  useOrchestrateSlice: boolean
): OrchestratorMode {
  const explicit = config?.loop?.orchestratorMode;
  if (explicit === "lead" || explicit === "orchestrate-slice" || explicit === "direct-builder") {
    return explicit;
  }
  if (explicit !== undefined && explicit !== null) {
    return "lead";
  }
  // No explicit setting → default to lead orchestration. Operators on older crew
  // can pin "orchestrate-slice" or "direct-builder" in .claude/loop.json.
  return useOrchestrateSlice ? "lead" : "lead";
}

// Resolve all feature-level signals + confidence verdict in one call.
// Extracted from startSlice to keep its cyclomatic complexity ≤ 15.
async function resolveFeatureSignals(
  repoPath: string,
  featureId: string | null,
  resolved: Record<string, any>,
  sliceContent: string,
  recentGradeAvg: number | null,
  dispatch: boolean
) {
  const feat = featureId
    ? await bestEffort(() => findFeatureById(repoPath, featureId, resolved))
    : null;
  const autonomousSafe: boolean | null = feat?.frontmatter?.autonomous_safe ?? null;
  const dependsOnCount = Array.isArray(feat?.frontmatter?.depends_on)
    ? feat.frontmatter.depends_on.length
    : 0;
  const acCount = detectAcceptanceCriteria(sliceContent).count;
  const { confidence, reason: confidenceReason } = computeConfidence({
    autonomousSafe,
    acCount,
    recentGradeAvg: typeof recentGradeAvg === "number" ? recentGradeAvg : null,
    dependsOnCount
  });
  const autoMode = resolved.loop?.autoMode === true;
  const requiresApprovalGate = computeApprovalGate(autonomousSafe, autoMode, dispatch);
  return { autonomousSafe, confidence, confidenceReason, requiresApprovalGate };
}

async function bestEffort(fn: (...args: any[]) => any) {
  try {
    return await fn();
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

// Compute whether plan preflight approval gate is required.
// Gate is required when: autonomous_safe=false AND not in auto mode AND dispatch is enabled.
export function computeApprovalGate(
  autonomousSafe: boolean | null,
  autoMode: boolean,
  dispatch: boolean
): boolean {
  return autonomousSafe === false && !autoMode && dispatch !== false;
}

// Quality gates that must pass before startSlice can proceed.
// Extracted to keep startSlice under the complexity cap.
async function runSliceStartGates(
  sliceId: string,
  content: string | null,
  repoPath: string,
  config: Record<string, any> | null
) {
  if (content) {
    const acResult = lintAcceptanceCriteria(content);
    if (!acResult.ok) {
      const detail = acResult.error
        ? acResult.error
        : `${acResult.violations.length} placeholder AC(s) found:\n${acResult.violations.map((v) => `  ${v.trim()}`).join("\n")}`;
      throw new Error(
        `startSlice(${sliceId}): AC linter failed — ${detail}. ` +
          "Replace all placeholder acceptance criteria before starting the slice."
      );
    }
  }
  const ladderGateSignal = await checkGradeTrend(repoPath, config);
  if (ladderGateSignal?.shouldStop) {
    throw new Error(
      `startSlice(${sliceId}): Ladder gate — ${ladderGateSignal.reason}. ` +
        "Resolve grade regression before starting the next slice."
    );
  }
}

// Opens a new run for the given slice. Symmetric counterpart to
// completeSlice: rotates workflow-state.currentRun via `crew
// write-run-brief` so cost-emit windows attribute work to this slice,
// then refreshes the slice-progress dashboard. Looks up the slice's
// human-readable title from the active plan when possible. Goal text
// is taken from the slice file's `Objective` block when present.
//
// When { dispatch: true } (default), the returned object includes a
// `dispatchInstruction` string — a literal prompt the loop agent
// should hand to a subagent so the actual implementation runs through
// `/crew:build` (per Dispatch Discipline HARD RULE in rules.md). Pass
// dispatch: false for manual / debugging invocations where the agent
// is doing the slice work in-conversation.
// AC-2 (SLICE-54 FEAT-056): wrap writeSessionIdToWorkflowState in a fail-open
// helper so startSlice's complexity stays under the lint cap.
async function pinSessionId(repoPath: string): Promise<void> {
  try {
    await writeSessionIdToWorkflowState(repoPath);
  } catch {
    // best-effort — never blocks slice start
  }
}

// ---------------------------------------------------------------------------
// SLICE-56 / FEAT-060: worktree persistence helpers
// ---------------------------------------------------------------------------

const STATE_PATH_PARTS = [".claude", "state", "crew", "workflow-state.json"];

/** Write worktreePath into workflow-state.currentRun. Returns prior value for rollback. */
async function writeWorktreePathToState(
  repoPath: string,
  worktreePath: string
): Promise<string | null> {
  const statePath = path.join(repoPath, ...STATE_PATH_PARTS);
  let state: any = { version: "1.0", currentRun: {} };
  try {
    const raw = await fs.readFile(statePath, "utf8");
    state = JSON.parse(raw);
  } catch {
    // Missing or unparseable — start from minimal schema.
  }
  if (!state.currentRun) state.currentRun = {};
  const prior: string | null = state.currentRun.worktreePath ?? null;
  state.currentRun.worktreePath = worktreePath;
  state.updatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
  return prior;
}

/** Roll back workflow-state.currentRun.worktreePath to its prior value (null clears it). */
async function rollbackWorktreePathInState(repoPath: string, prior: string | null): Promise<void> {
  try {
    const statePath = path.join(repoPath, ...STATE_PATH_PARTS);
    const raw = await fs.readFile(statePath, "utf8");
    const state = JSON.parse(raw);
    if (!state.currentRun) state.currentRun = {};
    if (prior === null) {
      delete state.currentRun.worktreePath;
    } else {
      state.currentRun.worktreePath = prior;
    }
    state.updatedAt = new Date().toISOString();
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // best-effort rollback — no secondary throw
  }
}

/** Write worktreePath into slice frontmatter. sliceFile must be an absolute path. */
async function writeWorktreePathToFrontmatter(
  sliceFile: string,
  worktreePath: string
): Promise<void> {
  const content = await fs.readFile(sliceFile, "utf8");
  const updated = mergeFrontmatter(content, { worktreePath });
  await fs.writeFile(sliceFile, updated, "utf8");
}

/**
 * Run ensureSliceWorktree, then persist the result into workflow-state and
 * slice frontmatter. Implements the write-order contract (state first,
 * frontmatter second) with compensating rollback on frontmatter failure.
 *
 * Returns WorktreeResult on success, or null when gate is off.
 * Propagates WorktreeError on hard git failure (no partial state written).
 */
async function resolveSliceWorktree(
  repoPath: string,
  sliceId: string,
  sliceFile: string | null,
  config: Record<string, any> | null,
  featureId: string | null
): Promise<WorktreeResult | undefined> {
  const result = await applyWorktreeResult(repoPath, sliceId, sliceFile, config, featureId);
  return result ?? undefined;
}

// Exported for test coverage of the rollback path (FEAT-060 contract failure-atomicity).
// Not part of the public API surface — internal helper.
export async function applyWorktreeResult(
  repoPath: string,
  sliceId: string,
  sliceFile: string | null,
  config: Record<string, any> | null,
  featureId: string | null
): Promise<WorktreeResult | null> {
  const result = await ensureSliceWorktree(repoPath, sliceId, { config, featureId });
  if (!result) return null;

  // Failure-atomicity invariant: if worktreeMode is on we MUST be able to write
  // BOTH workflow-state AND slice frontmatter. A null sliceFile means we
  // couldn't locate the slice on disk — refuse to write a half-state.
  if (!sliceFile) {
    throw new Error(
      `applyWorktreeResult(${sliceId}): slice file not found; refusing to write workflow-state.worktreePath without matching slice frontmatter (failure-atomicity invariant).`
    );
  }

  // Write state first (prior value captured for rollback)
  const prior = await writeWorktreePathToState(repoPath, result.worktreePath);

  // Write slice frontmatter — roll back state on failure.
  // sliceFile is non-null here (guarded above) — direct call, no nested if.
  try {
    await writeWorktreePathToFrontmatter(sliceFile, result.worktreePath);
  } catch (err) {
    await rollbackWorktreePathInState(repoPath, prior);
    throw err;
  }

  return result;
}

// Derive resolvedGoal/featureId/phase from slice ctx + caller goal.
// Extracted from startSlice to keep its cyclomatic complexity ≤ 15.
function resolveSliceMetaFields(
  goal: string | null,
  ctx: Record<string, any>
): { resolvedGoal: string | null; featureId: string | null; phase: string | null } {
  return {
    resolvedGoal: goal || ctx.goal,
    featureId: ctx.frontmatter.feature || null,
    phase: ctx.frontmatter.phase || null
  };
}

// eslint-disable-next-line complexity -- orchestration function; each sequential async gate adds a branch but no extractable helper reduces it further. Track if complexity grows past 20.
export async function startSlice(
  repoPath: string,
  sliceId: string,
  {
    config = null,
    goal = null,
    dispatch = true,
    _crewVersionOverride = undefined as string | null | undefined
  }: {
    config?: Record<string, any> | null;
    goal?: string | null;
    dispatch?: boolean;
    _crewVersionOverride?: string | null;
  } = {}
) {
  if (!sliceId) throw new Error("startSlice requires a sliceId.");
  const resolved: Record<string, any> = config ?? (await resolveConfig(repoPath));
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);

  const { activePlan, title: planTitle } = await resolvePlanAndTitle(repoPath, sliceId, resolved);

  const ctx = await readSliceContext(slicesRoot, sliceId);
  const title = resolveStartTitle(ctx, sliceId, planTitle);
  const { resolvedGoal, featureId, phase } = resolveSliceMetaFields(goal, ctx);

  await runSliceStartGates(sliceId, ctx.content ?? null, repoPath, resolved);

  const {
    runBrief,
    featureExcerpt,
    featurePath,
    marathonMilestone,
    gradeTrendCaution,
    learningsDigest,
    planPreflight,
    recentGradeAvg
  } = await gatherSliceResources(repoPath, {
    sliceId,
    title,
    resolvedGoal,
    featureId,
    phase,
    ctx,
    resolved
  });
  const sliceProgress = await refreshSliceProgress(repoPath, activePlan, sliceId, resolved);

  await pinSessionId(repoPath);

  // SLICE-56 / FEAT-060: create (or reuse) a per-slice git worktree when
  // loop.worktreeMode === true. Propagates WorktreeError on hard failure so
  // the CLI exits non-zero with an actionable message. When the gate is off
  // (default) this is a strict zero-op — worktreeInfo is undefined.
  const worktreeInfo = await resolveSliceWorktree(repoPath, sliceId, ctx.file, resolved, featureId);

  const { confidence, confidenceReason, requiresApprovalGate } = await resolveFeatureSignals(
    repoPath,
    featureId,
    resolved,
    ctx.content ?? "",
    recentGradeAvg,
    dispatch as boolean
  );

  const useOrchestrateSlice = await checkOrchestrateSliceSupport(
    _crewVersionOverride as string | null | undefined
  );
  const orchestratorMode = resolveOrchestratorModeConfig(resolved, useOrchestrateSlice);

  // SLICE-94 / FEAT-186: classify slice shape + write marker + build inline-path hint.
  const inlinePathHint = await applyShapeClassification(
    repoPath,
    sliceId,
    ctx.content ?? null,
    resolved.loop?.dispatchLimits ?? null
  );

  const result = buildStartSliceReturn({
    sliceId,
    title,
    activePlan,
    runBrief,
    sliceProgress,
    dispatch,
    sliceFile: ctx.file,
    repoPath,
    resolvedGoal,
    gradeTrendCaution,
    featureId,
    sliceContent: ctx.content ?? null,
    featureExcerpt,
    featurePath,
    marathonMilestone,
    dispatchLimits: resolved.loop?.dispatchLimits ?? null,
    orchestratorModel: resolveOrchestratorModel(resolved),
    learningsDigest,
    planPreflight: planPreflight ?? null,
    requiresApprovalGate,
    confidence,
    confidenceReason,
    useOrchestrateSlice,
    orchestratorMode,
    worktreeInfo,
    inlinePathHint
  });

  await recordStartTrajectory(repoPath, sliceId, result, featureId, title);
  void recordSliceStartEvent(repoPath, sliceId, featureId);
  return result;
}

// Gathers all parallel async resources for a slice start in one Promise.all.
// Extracted from startSlice to keep its cyclomatic complexity ≤ 15.
async function gatherSliceResources(
  repoPath: string,
  {
    sliceId,
    title,
    resolvedGoal,
    featureId,
    phase,
    ctx,
    resolved
  }: {
    sliceId: string;
    title: string;
    resolvedGoal: string | null;
    featureId: string | null;
    phase: string | null;
    ctx: Record<string, any>;
    resolved: Record<string, any>;
  }
) {
  const [runBrief, gradeTrend, featureResult, marathonMilestone, learningsResult, planPreflight] =
    await Promise.all([
      bestEffort(() =>
        writeCrewRunBrief(repoPath, {
          sliceId,
          title,
          goal: resolvedGoal,
          featureId,
          phase,
          mode: "autonomous",
          pace: "unattended",
          scope: ctx.scope,
          outOfScope: ctx.outOfScope
        })
      ),
      readGradeTrend(repoPath),
      featureId ? readFeatureExcerpt(repoPath, featureId, resolved) : Promise.resolve(null),
      checkMarathonMilestone(repoPath, resolved),
      bestEffort(() => recentLearnings(repoPath, 3)),
      bestEffort(() => runPlanPreflight(repoPath, sliceId, { config: resolved }))
    ]);
  const gradeTrendCaution =
    gradeTrend.consecutiveBelow > 0
      ? `Grade trend caution: ${gradeTrend.consecutiveBelow} consecutive slice(s) averaged below threshold. ` +
        "Review recent grades before continuing if this persists."
      : null;
  const learningsDigest = learningsResult?.digest ?? null;
  const recentGradeAvg = computeRecentGradeAvg(gradeTrend?.scores ?? []);
  const featureExcerpt = featureResult?.excerpt ?? null;
  const featurePath = featureResult?.path ?? null;
  return {
    runBrief,
    featureExcerpt,
    featurePath,
    marathonMilestone,
    gradeTrendCaution,
    learningsDigest,
    planPreflight,
    recentGradeAvg
  };
}

// Locate the active plan + derive the human-readable title for this slice
// from the plan match, falling back to bare sliceId. Extracted from
// startSlice to keep its cyclomatic complexity under the eslint cap.
// Canonical precedence: slice-file title (frontmatter -> H1) wins; the
// approved-slices plan entry is the fallback for slices with no file yet.
function resolveStartTitle(
  ctx: { frontmatter: Record<string, unknown>; content?: string | null },
  sliceId: string,
  planTitle: string
) {
  const fileTitle = displaySliceTitle(ctx.frontmatter, ctx.content ?? null, sliceId);
  return fileTitle !== sliceId ? fileTitle : planTitle;
}

async function resolvePlanAndTitle(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null = null
) {
  const activePlan = await findActivePlan(repoPath, config);
  const planMatch = activePlan.slices.find((s) => s.id === sliceId.toUpperCase());
  const title = planMatch ? `${sliceId}: ${planMatch.title}` : sliceId;
  return { activePlan, title };
}

function resolveActivePlanSummary(activePlan: Record<string, any>) {
  return activePlan.planPath ? { source: activePlan.source, path: activePlan.planPath } : null;
}

// Compute nextAction text based on requiresApprovalGate, dispatch, and planPreflight.
// Extracted to keep buildStartSliceReturn under the eslint complexity cap.
function computeNextAction(
  sliceId: string,
  requiresApprovalGate: boolean,
  dispatch: boolean,
  planPreflight: any,
  orchestratorMode: OrchestratorMode = "lead"
): string {
  if (requiresApprovalGate) {
    return `Review plan at ${planPreflight?.planPath ?? "plan artifact"}, then approve to dispatch crew:lead for ${sliceId}.`;
  }
  if (dispatch && orchestratorMode === "lead") {
    return `Dispatch crew:lead subagent for ${sliceId}; lead orchestrates architect/builder/reviewer/validator and closes via /loop:slice complete --id ${sliceId}.`;
  }
  if (dispatch && orchestratorMode === "orchestrate-slice") {
    return `Run /crew:orchestrate-slice --id ${sliceId}; close with /loop:slice complete --id ${sliceId}.`;
  }
  if (dispatch) {
    return `Dispatch crew:builder subagent for ${sliceId}; then dispatch crew:reviewer (and crew:validator if behavior changed); close with /loop:slice complete --id ${sliceId}.`;
  }
  return `Begin acceptance-criteria work for ${sliceId}. Close with /loop:slice complete --id ${sliceId}.`;
}

// Resolve dispatchInstruction or null. Extracted to keep buildStartSliceReturn ≤ 15.
function resolveDispatchInstruction(
  dispatch: boolean,
  sliceId: string,
  title: string,
  sliceFile: string | null,
  repoPath: string,
  resolvedGoal: string | null,
  featureId: string | null,
  sliceContent: string | null,
  featureExcerpt: string | null,
  featurePath: string | null,
  dispatchLimits: { maxSubagentsPerSlice: number; preferInlineFor?: string[] } | null,
  useOrchestrateSlice = false,
  worktreePath: string | null = null,
  orchestratorMode: OrchestratorMode = "lead",
  inlinePathHint: string | null = null
) {
  if (!dispatch) return null;
  const base = buildDispatchInstruction({
    sliceId,
    title,
    sliceFile,
    repoPath,
    resolvedGoal,
    featureId,
    sliceContent,
    featureExcerpt,
    featurePath,
    dispatchLimits,
    useOrchestrateSlice,
    orchestratorMode,
    worktreePath
  });
  return inlinePathHint ? `${base}\n\n${inlinePathHint}` : base;
}

// Build the return shape for startSlice. Extracted to keep startSlice
// under the eslint complexity cap; no behavior change.
function attachWorktreeSection(
  base: Record<string, any>,
  worktreeInfo: WorktreeResult | undefined
): void {
  if (!worktreeInfo) return;
  base.worktree = {
    path: worktreeInfo.worktreePath,
    branchName: worktreeInfo.branchName,
    created: worktreeInfo.created,
    reused: worktreeInfo.reused
  };
}

// eslint-disable-next-line complexity -- pure object builder; defaults destructuring inflates cyclomatic count but actual runtime branching is minimal (only attachWorktreeSection adds a real branch). Track as follow-up to convert to a typed options object.
function buildStartSliceReturn({
  sliceId,
  title,
  activePlan,
  runBrief,
  sliceProgress,
  dispatch,
  sliceFile,
  repoPath,
  resolvedGoal,
  gradeTrendCaution = null,
  featureId = null,
  sliceContent = null,
  featureExcerpt = null,
  featurePath = null,
  marathonMilestone = null,
  dispatchLimits = null,
  orchestratorModel = null,
  learningsDigest = null,
  planPreflight = null,
  requiresApprovalGate = false,
  confidence = null,
  confidenceReason = null,
  useOrchestrateSlice = false,
  orchestratorMode = "lead",
  worktreeInfo = undefined,
  inlinePathHint = null
}: {
  sliceId: string;
  title: string;
  activePlan: Record<string, any>;
  runBrief: Record<string, any> | null;
  sliceProgress: Record<string, any> | null;
  dispatch: boolean;
  sliceFile: string | null;
  repoPath: string;
  resolvedGoal: string | null;
  gradeTrendCaution?: string | null;
  featureId?: string | null;
  sliceContent?: string | null;
  featureExcerpt?: string | null;
  featurePath?: string | null;
  marathonMilestone?: Record<string, any> | null;
  dispatchLimits?: { maxSubagentsPerSlice: number; preferInlineFor?: string[] } | null;
  orchestratorModel?: string | null;
  learningsDigest?: string | null;
  planPreflight?: Record<string, any> | null;
  requiresApprovalGate?: boolean;
  confidence?: string | null;
  confidenceReason?: string | null;
  useOrchestrateSlice?: boolean;
  orchestratorMode?: OrchestratorMode;
  worktreeInfo?: WorktreeResult | undefined;
  inlinePathHint?: string | null;
}) {
  const worktreePath = worktreeInfo?.worktreePath ?? null;
  const dispatchInstruction = resolveDispatchInstruction(
    dispatch,
    sliceId,
    title,
    sliceFile,
    repoPath,
    resolvedGoal,
    featureId,
    sliceContent,
    featureExcerpt,
    featurePath,
    dispatchLimits,
    useOrchestrateSlice,
    worktreePath,
    orchestratorMode,
    inlinePathHint
  );
  const activePlanSummary = resolveActivePlanSummary(activePlan);
  const nextAction = computeNextAction(
    sliceId,
    requiresApprovalGate,
    dispatch,
    planPreflight,
    orchestratorMode
  );
  // expectedHandoff: hint so parent (or slice-complete) can detect
  // specialist-pause missing-artifact case. See
  // docs/upstream-requests/2026-06-10-hero-crew-specialist-pause-completion-enforcement.md
  const featSlug = featureId ? String(featureId).toLowerCase().replace(/[^a-z0-9]+/g, "") : null;
  const sliceSlug = String(sliceId).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const handoffSlug = featSlug ? `${featSlug}-${sliceSlug}` : sliceSlug;
  const expectedHandoff = {
    dir: ".claude/artifacts/crew/handoffs",
    glob: `*${handoffSlug}*.md`,
    sliceSlug,
    featureSlug: featSlug
  };
  const base: Record<string, any> = {
    slice: { id: sliceId, title },
    activePlan: activePlanSummary,
    runBrief,
    sliceProgress,
    dispatchInstruction,
    expectedHandoff,
    nextAction,
    gradeTrendCaution,
    marathonMilestone,
    orchestratorModel,
    learningsDigest,
    planPreflight,
    requiresApprovalGate,
    confidence,
    confidenceReason
  };
  attachWorktreeSection(base, worktreeInfo);
  return base;
}

// Refresh the slice-progress dashboard with the new currentSliceId.
// Extracted from startSlice purely to lower its cyclomatic complexity.
async function refreshSliceProgress(
  repoPath: string,
  activePlan: Record<string, any>,
  sliceId: string,
  config: Record<string, any> | null = null
) {
  return bestEffort(async () => {
    const enriched = await detectSliceStatus(repoPath, activePlan.slices, {
      slicesRoot: resolveSlicesRoot(repoPath, config)
    });
    return writeSliceProgress(repoPath, {
      activePlan,
      slices: enriched,
      currentSliceId: sliceId
    });
  });
}

async function recordStartTrajectory(
  repoPath: string,
  sliceId: string,
  result: Record<string, any>,
  featureId: string | null,
  title: string
) {
  try {
    const { recordStep } = await import("../trajectory-writer.mjs");
    await recordStep(repoPath, sliceId, "slice_start", {
      featureId: featureId ?? null,
      title,
      planPath: result.planPreflight?.planPath ?? null,
      requiresApprovalGate: result.requiresApprovalGate ?? false
    });
  } catch {
    // best-effort — never blocks slice start
  }
}

async function recordSliceStartEvent(
  repoPath: string,
  sliceId: string,
  featureId: string | null
): Promise<void> {
  try {
    const { appendSliceEvent } = await import("../slice-events.mjs");
    await appendSliceEvent(repoPath, sliceId, {
      type: "workflow_state_changed",
      sliceId,
      featureId,
      timestamp: new Date().toISOString(),
      from: null,
      to: "building"
    });
  } catch (err) {
    console.warn(
      `[slice-events] start-event failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
