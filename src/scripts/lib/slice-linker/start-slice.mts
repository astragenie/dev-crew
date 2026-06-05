import { resolveConfig } from "../config-resolver.mjs";
import { readGradeTrend, checkGradeTrend, checkMarathonMilestone } from "../grade-trend.mjs";
import { lintAcceptanceCriteria } from "../ac-linter.mjs";
import { writeCrewRunBrief } from "./crew-bridge.mjs";
import { findActivePlan, detectSliceStatus, writeSliceProgress } from "./slice-progress.mjs";
import { slicesRoot as resolveSlicesRoot } from "../paths.mjs";
import { readSliceContext, readFeatureExcerpt, buildDispatchInstruction } from "./dispatch.mjs";
import { recentLearnings } from "../learnings.mjs";
import { resolveOrchestratorModel } from "../model-router.mjs";
import { runPlanPreflight } from "../slice-plan.mjs";
import { findFeatureById } from "../backlog-writer.mjs";
import { detectAcceptanceCriteria } from "../backlog-triage.mjs";
import { computeConfidence } from "../confidence-signal.mjs";
import { checkOrchestrateSliceSupport } from "../plugin-identity.mjs";

function computeRecentGradeAvg(scores: Array<{ sliceId: string; avg: number }>): number | null {
  if (!scores || scores.length === 0) return null;
  const recent = scores.slice(-3);
  return recent.reduce((sum, s) => sum + s.avg, 0) / recent.length;
}

// Resolve all feature-level signals + confidence verdict in one call.
// Extracted from startSlice to keep its cyclomatic complexity ≤ 15.
async function resolveFeatureSignals(
  repoPath,
  featureId,
  resolved,
  sliceContent: string,
  recentGradeAvg,
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

async function bestEffort(fn) {
  try {
    return await fn();
  } catch (err) {
    return { error: err.message };
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
async function runSliceStartGates(sliceId, content, repoPath, config) {
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
export async function startSlice(
  repoPath,
  sliceId,
  {
    config = null,
    goal = null,
    dispatch = true,
    _crewVersionOverride = undefined as string | null | undefined
  }: Record<string, unknown> = {}
) {
  if (!sliceId) throw new Error("startSlice requires a sliceId.");
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);

  const { activePlan, title } = await resolvePlanAndTitle(repoPath, sliceId, resolved);

  const ctx = await readSliceContext(slicesRoot, sliceId);
  const resolvedGoal = goal || ctx.goal;
  const featureId = ctx.frontmatter.feature || null;
  const phase = ctx.frontmatter.phase || null;

  await runSliceStartGates(sliceId, ctx.content, repoPath, resolved);

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
    sliceContent: ctx.content,
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
    useOrchestrateSlice
  });

  await recordStartTrajectory(repoPath, sliceId, result, featureId, title);
  return result;
}

// Gathers all parallel async resources for a slice start in one Promise.all.
// Extracted from startSlice to keep its cyclomatic complexity ≤ 15.
async function gatherSliceResources(
  repoPath,
  { sliceId, title, resolvedGoal, featureId, phase, ctx, resolved }
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
async function resolvePlanAndTitle(repoPath, sliceId, config = null) {
  const activePlan = await findActivePlan(repoPath, config);
  const planMatch = activePlan.slices.find((s) => s.id === sliceId.toUpperCase());
  const title = planMatch ? `${sliceId}: ${planMatch.title}` : sliceId;
  return { activePlan, title };
}

function resolveActivePlanSummary(activePlan) {
  return activePlan.planPath ? { source: activePlan.source, path: activePlan.planPath } : null;
}

// Compute nextAction text based on requiresApprovalGate, dispatch, and planPreflight.
// Extracted to keep buildStartSliceReturn under the eslint complexity cap.
function computeNextAction(
  sliceId: string,
  requiresApprovalGate: boolean,
  dispatch: boolean,
  planPreflight: any,
  useOrchestrateSlice = false
): string {
  if (requiresApprovalGate) {
    return `Review plan at ${planPreflight?.planPath ?? "plan artifact"}, then approve to dispatch crew:builder for ${sliceId}.`;
  }
  if (dispatch && useOrchestrateSlice) {
    return `Run /crew:orchestrate-slice --id ${sliceId}; close with /loop:slice complete --id ${sliceId}.`;
  }
  if (dispatch) {
    return `Dispatch crew:builder subagent for ${sliceId}; then dispatch crew:reviewer (and crew:validator if behavior changed); close with /loop:slice complete --id ${sliceId}.`;
  }
  return `Begin acceptance-criteria work for ${sliceId}. Close with /loop:slice complete --id ${sliceId}.`;
}

// Resolve dispatchInstruction or null. Extracted to keep buildStartSliceReturn ≤ 15.
function resolveDispatchInstruction(
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
  useOrchestrateSlice = false
) {
  return dispatch
    ? buildDispatchInstruction({
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
        useOrchestrateSlice
      })
    : null;
}

// Build the return shape for startSlice. Extracted to keep startSlice
// under the eslint complexity cap; no behavior change.
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
  gradeTrendCaution = null as any,
  featureId = null as any,
  sliceContent = null as any,
  featureExcerpt = null as any,
  featurePath = null as any,
  marathonMilestone = null as any,
  dispatchLimits = null as any,
  orchestratorModel = null as any,
  learningsDigest = null as any,
  planPreflight = null as any,
  requiresApprovalGate = false as any,
  confidence = null as any,
  confidenceReason = null as any,
  useOrchestrateSlice = false as boolean
}) {
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
    useOrchestrateSlice
  );
  const activePlanSummary = resolveActivePlanSummary(activePlan);
  const nextAction = computeNextAction(
    sliceId,
    requiresApprovalGate,
    dispatch,
    planPreflight,
    useOrchestrateSlice
  );
  return {
    slice: { id: sliceId, title },
    activePlan: activePlanSummary,
    runBrief,
    sliceProgress,
    dispatchInstruction,
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
}

// Refresh the slice-progress dashboard with the new currentSliceId.
// Extracted from startSlice purely to lower its cyclomatic complexity.
async function refreshSliceProgress(repoPath, activePlan, sliceId, config = null) {
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

async function recordStartTrajectory(repoPath, sliceId, result, featureId, title) {
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
