import { resolveConfig } from "../config-resolver.mjs";
import { readGradeTrend, checkGradeTrend, checkMarathonMilestone } from "../grade-trend.mjs";
import { lintAcceptanceCriteria } from "../ac-linter.mjs";
import { writeCrewRunBrief } from "./crew-bridge.mjs";
import { findActivePlan, detectSliceStatus, writeSliceProgress } from "./slice-progress.mjs";
import { slicesRoot as resolveSlicesRoot } from "../paths.mjs";
import { readSliceContext, readFeatureExcerpt, buildDispatchInstruction } from "./dispatch.mjs";
import { recentLearnings } from "../learnings.mjs";
import { resolveOrchestratorModel } from "../model-router.mjs";

async function bestEffort(fn) {
  try {
    return await fn();
  } catch (err) {
    return { error: err.message };
  }
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
  { config = null, goal = null, dispatch = true }: Record<string, unknown> = {}
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

  const { runBrief, featureExcerpt, marathonMilestone, gradeTrendCaution, learningsDigest } =
    await gatherSliceResources(repoPath, { sliceId, title, resolvedGoal, featureId, phase, ctx, resolved });
  const sliceProgress = await refreshSliceProgress(repoPath, activePlan, sliceId, resolved);

  return buildStartSliceReturn({
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
    marathonMilestone,
    dispatchLimits: resolved.loop?.dispatchLimits ?? null,
    orchestratorModel: resolveOrchestratorModel(resolved),
    learningsDigest
  });
}

// Gathers all parallel async resources for a slice start in one Promise.all.
// Extracted from startSlice to keep its cyclomatic complexity ≤ 15.
async function gatherSliceResources(repoPath, { sliceId, title, resolvedGoal, featureId, phase, ctx, resolved }) {
  const [runBrief, gradeTrend, featureExcerpt, marathonMilestone, learningsResult] = await Promise.all([
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
    bestEffort(() => recentLearnings(repoPath, 3))
  ]);
  const gradeTrendCaution =
    gradeTrend.consecutiveBelow > 0
      ? `Grade trend caution: ${gradeTrend.consecutiveBelow} consecutive slice(s) averaged below threshold. ` +
        "Review recent grades before continuing if this persists."
      : null;
  const learningsDigest = learningsResult?.digest ?? null;
  return { runBrief, featureExcerpt, marathonMilestone, gradeTrendCaution, learningsDigest };
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
  marathonMilestone = null as any,
  dispatchLimits = null as any,
  orchestratorModel = null as any,
  learningsDigest = null as any
}) {
  const dispatchInstruction = dispatch
    ? buildDispatchInstruction({
        sliceId,
        title,
        sliceFile,
        repoPath,
        resolvedGoal,
        featureId,
        sliceContent,
        featureExcerpt,
        dispatchLimits
      })
    : null;
  const activePlanSummary = activePlan.planPath
    ? { source: activePlan.source, path: activePlan.planPath }
    : null;
  const nextAction = dispatch
    ? `Dispatch /crew:build subagent for ${sliceId}; close with /loop:slice complete --id ${sliceId}.`
    : `Begin acceptance-criteria work for ${sliceId}. Close with /loop:slice complete --id ${sliceId}.`;
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
    learningsDigest
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
