import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig } from "../config-resolver.mjs";
import { parseFrontmatter } from "../frontmatter.mjs";
import { detectSerialReviewer } from "../reviewer-timing.mjs";
import { findFeatureById, moveFeature, updateFeatureFrontmatter } from "../backlog-writer.mjs";
import { updateSliceFrontmatter, moveSlice } from "../backlog-store.mjs";
import { readCrewWorkflowState } from "../crew-workflow-reader.mjs";
import { readFeatureEndCeremony } from "../ceremonies.mjs";
import {
  markValidationSkippedBadge,
  tryWriteAgentReport,
  tryWriteCostReport,
  writeCrewFinalSynthesis,
  writeCrewHandoff
} from "./crew-bridge.mjs";
import { computePostBuilderConfidence } from "../confidence-signal.mjs";
import type { BuilderEvidence } from "../confidence-signal.mjs";
import { deriveValidationGate } from "../validation-gate.mjs";
import { deriveTestAdequacyGate } from "../test-adequacy-gate.mjs";
import { findActivePlan, detectSliceStatus, writeSliceProgress } from "./slice-progress.mjs";
import { locateSliceFile, slicesRoot as resolveSlicesRoot } from "../paths.mjs";
import { clearWorktreePathInState } from "../auto-merge.mjs";
import { resolveSliceTitle } from "../slice-title.mjs";
import type { MergeResult, DryRunPlan } from "../auto-merge.mjs";

function deriveBlockingGates(workflowState: Record<string, any> | null) {
  const gates = workflowState?.currentRun?.gates || {};
  const blocked = gates.blocked?.status === "blocked" ? gates.blocked : null;
  const escalated = gates.escalation?.status === "escalated" ? gates.escalation : null;
  return { blocked, escalated };
}

async function bestEffort(fn: (...args: any[]) => any) {
  try {
    return await fn();
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

// Decides the target path (pending/active/in-progress -> completed; else
// stamps in place), merges frontmatter via BacklogStore. Returns the new
// path.
async function moveAndStampSlice({
  sliceFile,
  sliceFm,
  today,
  repoPath,
  config
}: {
  sliceFile: string;
  sliceFm: Record<string, any>;
  today: string;
  repoPath: string;
  config: Record<string, any> | null;
}) {
  const parentDir = path.basename(path.dirname(sliceFile));
  const completedAt = sliceFm.completed_at || today;
  if (parentDir === "pending" || parentDir === "active" || parentDir === "in-progress") {
    const result = await moveSlice(
      sliceFile,
      "completed",
      { completed_at: completedAt },
      repoPath,
      config
    );
    return result.to;
  }
  await updateSliceFrontmatter(
    sliceFile,
    { status: "completed", completed_at: completedAt },
    repoPath,
    config
  );
  return sliceFile;
}

// Moves the slice's linked feature to done/ when present and not yet done.
// Returns null when there is no linked feature, or a result object
// describing the move (or the alreadyDone or kept-open case).
//
// Skips the move when:
//   - feat.frontmatter.feature_complete === false (operator opts out for multi-slice features)
//   - keepFeatureOpen === true (runtime CLI override via --keep-feature-open)
async function moveFeatureToDone(
  repoPath: string,
  featureId: string | null,
  config: Record<string, any> | null,
  keepFeatureOpen = false
) {
  if (!featureId) return null;
  const feat = await findFeatureById(repoPath, featureId, config);
  if (!feat) return null;
  if (feat.state === "done") {
    return { id: featureId, alreadyDone: true, path: feat.filePath };
  }
  const featureComplete = feat.frontmatter?.feature_complete;
  if (keepFeatureOpen) {
    return {
      id: featureId,
      keptOpen: true,
      reason: "runtime --keep-feature-open flag set",
      path: feat.filePath
    };
  }
  if (featureComplete === false) {
    return {
      id: featureId,
      keptOpen: true,
      reason: "feature frontmatter feature_complete: false",
      path: feat.filePath
    };
  }
  const moved = await moveFeature(feat.filePath, "done");
  return { id: featureId, from: moved.from, to: moved.to };
}

// Compute featureResult based on blocking gates, simplify ceremony, and
// validation gate. Validation gate fires when the slice closed without a
// validation artifact under .claude/artifacts/crew/validations/ AND without
// a validation_passed/skipped badge AND without a requires_validation: false
// waiver in slice frontmatter. The slice file itself still moves to
// completed/; only the feature->done transition is held back.
function describeBlockedGate({
  isBlocked,
  isSimplifyBlocked,
  blockingGates,
  validationGate,
  testAdequacyGate,
  reviewGate
}: {
  isBlocked: boolean;
  isSimplifyBlocked: boolean;
  blockingGates: Record<string, any>;
  validationGate: Record<string, any> | null;
  testAdequacyGate: Record<string, any> | null;
  reviewGate?: Record<string, any> | null;
}) {
  if (isBlocked) {
    return blockingGates.escalated
      ? `crew run escalated_to_human: ${blockingGates.escalated.note || ""}`
      : `crew run blocked: ${blockingGates.blocked?.note || ""}`;
  }
  if (isSimplifyBlocked) {
    return "simplify-gate: featureEnd ceremony exists but simplifyRan is false";
  }
  if (reviewGate?.satisfied === false) return `review-gate: ${reviewGate.reason}`;
  if (testAdequacyGate?.satisfied === false) return testAdequacyGate.reason;
  return `validation-gate: ${validationGate?.reason ?? "no evidence"}`;
}

async function evaluateFeatureGates(
  repoPath: string,
  sliceId: string,
  featureId: string | null,
  blockingGates: Record<string, any>,
  validationGate: Record<string, any> | null,
  testAdequacyGate: Record<string, any> | null,
  reviewGate: Record<string, any> | null = null
) {
  const isBlocked = Boolean(blockingGates.blocked || blockingGates.escalated);
  const simplifyCeremony = featureId ? await readFeatureEndCeremony(repoPath, featureId) : null;
  const isSimplifyBlocked = Boolean(simplifyCeremony && simplifyCeremony.simplifyRan === false);
  const isValidationBlocked = Boolean(validationGate && validationGate.satisfied === false);
  const isTestAdequacyBlocked = Boolean(testAdequacyGate && testAdequacyGate.satisfied === false);
  // P1.4: a rejected review holds the FEAT→done promotion (SLICE-174 fix).
  const isReviewBlocked = Boolean(reviewGate && reviewGate.satisfied === false);

  void emitGateTransitionEvents(repoPath, sliceId, featureId, {
    isBlocked,
    isSimplifyBlocked,
    isValidationBlocked,
    isTestAdequacyBlocked,
    isReviewBlocked
  });

  return {
    isBlocked,
    isSimplifyBlocked,
    isValidationBlocked,
    isTestAdequacyBlocked,
    isReviewBlocked
  };
}

// Appends sliceId to the FEAT's slices_complete array (dedupe), writes back
// the updated frontmatter via BacklogStore. Returns { slicesComplete, remainingSlices }.
// repoPath/config omitted (matches the sibling moveFeature call in
// applyMultiSliceLogic below) — assertStatePath enforcement here is future
// work, not part of this migration.
async function updateSlicesComplete(
  feat: any,
  sliceId: string
): Promise<{ slicesComplete: string[]; remainingSlices: string[] }> {
  const planned: string[] = Array.isArray(feat.frontmatter?.slices)
    ? [...feat.frontmatter.slices]
    : [];
  const existing: string[] = Array.isArray(feat.frontmatter?.slices_complete)
    ? [...feat.frontmatter.slices_complete]
    : [];
  const slicesComplete: string[] = existing.includes(sliceId) ? existing : [...existing, sliceId];
  const remainingSlices: string[] = planned.filter((s) => !slicesComplete.includes(s));

  await updateFeatureFrontmatter(feat.filePath, { slices_complete: slicesComplete });

  return { slicesComplete, remainingSlices };
}

// Applies multi-slice detection for a FEAT that has a non-empty slices array.
// Returns a result object to short-circuit computeFeatureResult, or null to
// fall through to the default moveFeatureToDone path.
async function applyMultiSliceLogic(
  _repoPath: string,
  feat: any,
  featureId: string,
  sliceId: string,
  keepFeatureOpen: boolean,
  forceClose: boolean,
  _config: Record<string, any> | null
) {
  const planned: string[] = Array.isArray(feat.frontmatter?.slices)
    ? [...feat.frontmatter.slices]
    : [];
  if (planned.length === 0) return null;

  const { slicesComplete, remainingSlices } = await updateSlicesComplete(feat, sliceId);

  if (remainingSlices.length > 0 && !forceClose && !keepFeatureOpen) {
    return {
      id: featureId,
      skipped: true,
      reason: `multi-slice: ${remainingSlices.join(", ")} still pending`,
      remainingSlices,
      slicesComplete,
      path: feat.filePath
    };
  }

  if (forceClose && remainingSlices.length > 0) {
    const moved = await moveFeature(feat.filePath, "done", {
      force_closed: true,
      slices_remaining_at_close: remainingSlices,
      slices_complete: slicesComplete
    });
    return { id: featureId, from: moved.from, to: moved.to };
  }

  // remaining == 0 (or keepFeatureOpen): fall through
  return null;
}

function buildBlockedResult(
  gateState: {
    isBlocked: boolean;
    isSimplifyBlocked: boolean;
    isValidationBlocked: boolean;
    isTestAdequacyBlocked: boolean;
    isReviewBlocked?: boolean;
  },
  blockingGates: Record<string, any>,
  validationGate: Record<string, any> | null,
  testAdequacyGate: Record<string, any> | null,
  reviewGate: Record<string, any> | null = null
) {
  const { isBlocked, isSimplifyBlocked, isValidationBlocked, isTestAdequacyBlocked } = gateState;
  const isReviewBlocked = Boolean(gateState.isReviewBlocked);
  return {
    skipped: true,
    reason: describeBlockedGate({
      isBlocked,
      isSimplifyBlocked,
      blockingGates,
      validationGate,
      testAdequacyGate,
      reviewGate
    }),
    blockingGates: isBlocked ? blockingGates : null,
    simplifyGate: isSimplifyBlocked ? { simplifyRan: false } : null,
    validationGate: isValidationBlocked ? validationGate : null,
    testAdequacyGate: isTestAdequacyBlocked ? testAdequacyGate : null,
    reviewGate: isReviewBlocked ? reviewGate : null
  };
}

async function computeFeatureResult(
  repoPath: string,
  featureId: string | null,
  blockingGates: Record<string, any>,
  config: Record<string, any> | null,
  sliceId: string,
  keepFeatureOpen = false,
  forceClose = false,
  validationGate: Record<string, any> | null = null,
  testAdequacyGate: Record<string, any> | null = null,
  reviewGate: Record<string, any> | null = null
) {
  const gateState = await evaluateFeatureGates(
    repoPath,
    sliceId,
    featureId,
    blockingGates,
    validationGate,
    testAdequacyGate,
    reviewGate
  );

  const {
    isBlocked,
    isSimplifyBlocked,
    isValidationBlocked,
    isTestAdequacyBlocked,
    isReviewBlocked
  } = gateState;
  const anyGateBlocked =
    isBlocked ||
    isSimplifyBlocked ||
    isValidationBlocked ||
    isTestAdequacyBlocked ||
    isReviewBlocked;
  if (anyGateBlocked) {
    // P1.4 (D1): forceClose may override review/validation/test-adequacy
    // verdict blocks — with a full audit trail (slice frontmatter badge +
    // slice_force_closed event + halt-badge fan-out). escalated_to_human and
    // crew `blocked` badges are NEVER force-closable.
    const forceEligible = !isBlocked && !isSimplifyBlocked;
    if (forceClose && forceEligible) {
      const overridden: string[] = [];
      if (isReviewBlocked && reviewGate) overridden.push(`review: ${reviewGate.reason}`);
      if (isValidationBlocked && validationGate)
        overridden.push(`validation: ${validationGate.reason}`);
      if (isTestAdequacyBlocked && testAdequacyGate)
        overridden.push(`test-adequacy: ${testAdequacyGate.reason}`);
      await auditForceClose(repoPath, sliceId, featureId, overridden, config);
    } else {
      return buildBlockedResult(
        gateState,
        blockingGates,
        validationGate,
        testAdequacyGate,
        reviewGate
      );
    }
  }

  if (featureId) {
    const feat = await findFeatureById(repoPath, featureId, config);
    if (feat && feat.state !== "done") {
      const multiSliceResult = await applyMultiSliceLogic(
        repoPath,
        feat,
        featureId,
        sliceId,
        keepFeatureOpen,
        forceClose,
        config
      );
      if (multiSliceResult !== null) return multiSliceResult;
    }
  }

  return await moveFeatureToDone(repoPath, featureId, config, keepFeatureOpen);
}

// P1.4 (D1 resolved): forceClose past a failed verdict gate keeps working but
// leaves a full audit trail — `force_closed: true` + reason in the slice
// frontmatter (single- and multi-slice alike), a `slice_force_closed` event on
// the slice event stream, and a halt-badge fan-out so the dashboard tape
// surfaces it. Best-effort: audit failures never block the close itself.
async function auditForceClose(
  repoPath: string,
  sliceId: string,
  featureId: string | null,
  overriddenGates: string[],
  config: Record<string, any> | null
): Promise<void> {
  const reason = `force-close overrode ${overriddenGates.length} gate(s)`;
  try {
    const slicesRootDir = resolveSlicesRoot(repoPath, config);
    // The slice file moved pending/ → completed/ before gate evaluation runs;
    // bust the locate cache so the audit lands on the post-move path.
    const { bust } = await import("../cache.mjs");
    bust(`locateSlice:${slicesRootDir}:${sliceId}`);
    const sliceFile = await locateSliceFile(slicesRootDir, sliceId);
    if (sliceFile) {
      await updateSliceFrontmatter(
        sliceFile,
        { force_closed: true, force_closed_reason: overriddenGates },
        repoPath,
        config
      );
    }
  } catch (err) {
    console.warn(
      `[force-close] frontmatter audit failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
  try {
    const { appendSliceEvent } = await import("../slice-events.mjs");
    await appendSliceEvent(repoPath, sliceId, {
      type: "slice_force_closed",
      sliceId,
      featureId,
      timestamp: new Date().toISOString(),
      overriddenGates,
      reason
    });
  } catch (err) {
    console.warn(
      `[force-close] event audit failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
  try {
    const { fanoutEnvelope } = await import("../webhook-fanout.mjs");
    await fanoutEnvelope(repoPath, "halt-badge", {
      kind: "forceClosedGate",
      sliceId,
      featureId,
      overriddenGates,
      ts: new Date().toISOString()
    });
  } catch {
    // fan-out is optional connectivity — silent
  }
}

// Resolves the validation gate: --skip-validation-check writes a
// validation_skipped badge first so the bypass is auditable, then shortcuts
// the gate to satisfied. Otherwise derives from artifacts / badges / waiver.
async function resolveValidationGate(
  repoPath: string,
  sliceId: string,
  sliceFm: Record<string, any>,
  skipValidationCheck: string | null,
  config: Record<string, any> | null
): Promise<{ validationGate: any; validationSkippedBadge: any }> {
  if (!skipValidationCheck) {
    const validationGate = await deriveValidationGate(repoPath, sliceId, { sliceFm, config });
    return { validationGate, validationSkippedBadge: null };
  }
  const reason = String(skipValidationCheck).trim();
  if (!reason) {
    throw new Error(
      "--skip-validation-check requires a non-empty reason. " +
        "Example: --skip-validation-check 'doc-only slice, no behavior'."
    );
  }
  const validationSkippedBadge = await bestEffort(() =>
    markValidationSkippedBadge(repoPath, reason)
  );
  const validationGate = {
    satisfied: true,
    reason: `--skip-validation-check: ${reason}`,
    evidence: [] as string[]
  };
  return { validationGate, validationSkippedBadge };
}

// Reads slice file, parses frontmatter, and resolves workflow state. Extracted
// to keep completeSlice under the complexity budget.
async function resolveSliceContext(
  repoPath: string,
  sliceFile: string,
  cachedWorkflowState?: Awaited<ReturnType<typeof readCrewWorkflowState>>
) {
  const sliceContent = await fs.readFile(sliceFile, "utf8");
  const { frontmatter: sliceFm } = parseFrontmatter(sliceContent);
  const featureId = sliceFm.feature || null;
  const phase = sliceFm.phase || null;
  const today = new Date().toISOString().slice(0, 10);
  const workflowState = cachedWorkflowState ?? (await readCrewWorkflowState(repoPath));
  const startedAt = workflowState?.currentRun?.startedAt ?? null;
  const blockingGates = deriveBlockingGates(workflowState);
  return { sliceContent, sliceFm, featureId, phase, today, startedAt, blockingGates };
}

// Writes all best-effort ceremony artifacts in parallel. Extracted to keep
// completeSlice under the complexity budget.
async function writeCeremonyArtifacts(
  repoPath: string,
  {
    sliceId,
    featureId,
    phase,
    featureResult,
    specChanges,
    targetSlicePath,
    startedAt,
    resolved
  }: {
    sliceId: string;
    featureId: string | null;
    phase: string | null | undefined;
    featureResult: Record<string, any> | null;
    specChanges: Record<string, any>[];
    targetSlicePath: string;
    startedAt: string | null;
    resolved: Record<string, any> | null;
  }
) {
  const crewArgs: Record<string, any> = {
    sliceId,
    slicePath: targetSlicePath,
    featureId,
    phase,
    featureResult,
    specChanges,
    config: resolved
  };

  type CrewArgs = Parameters<typeof writeCrewHandoff>[1];
  const [handoff, synthesis, costReport, agentReport] = await Promise.all([
    bestEffort(() => writeCrewHandoff(repoPath, crewArgs as unknown as CrewArgs)),
    bestEffort(() => writeCrewFinalSynthesis(repoPath, crewArgs as unknown as CrewArgs)),
    bestEffort(() => tryWriteCostReport(repoPath, { sliceId, featureId, phase }, resolved)),
    bestEffort(() =>
      tryWriteAgentReport(repoPath, {
        sliceId,
        featureId,
        ...(phase !== undefined ? { phase } : {}),
        startedAt
      })
    )
  ]);

  const sliceProgress = await bestEffort(async () => {
    const activePlan = await findActivePlan(repoPath, resolved);
    const enriched = await detectSliceStatus(repoPath, activePlan.slices, {
      slicesRoot: resolveSlicesRoot(repoPath, resolved)
    });
    return writeSliceProgress(repoPath, { activePlan, slices: enriched, currentSliceId: null });
  });

  return { handoff, synthesis, costReport, agentReport, sliceProgress };
}

// Builds the final return object for completeSlice. Extracted to keep
// completeSlice under the cyclomatic-complexity cap.
function buildCompleteResult({
  sliceId,
  sliceFile,
  targetSlicePath,
  featureResult,
  specChanges,
  handoff,
  synthesis,
  costReport,
  agentReport,
  sliceProgress,
  validationGate,
  validationSkippedBadge,
  testAdequacyGate,
  reviewGate,
  builderEvidence,
  autoMergeResult
}: {
  sliceId: string;
  sliceFile: string;
  targetSlicePath: string;
  featureResult: any;
  specChanges: any;
  handoff: any;
  synthesis: any;
  costReport: any;
  agentReport: any;
  sliceProgress: any;
  validationGate: any;
  validationSkippedBadge: any;
  testAdequacyGate: any;
  reviewGate?: any;
  builderEvidence: BuilderEvidence | null;
  autoMergeResult?: MergeResult | DryRunPlan | { skipped: true; reason: string } | null;
}) {
  const updatedConfidence = builderEvidence ? computePostBuilderConfidence(builderEvidence) : null;
  return {
    slice: { id: sliceId, from: sliceFile, to: targetSlicePath },
    feature: featureResult,
    specStatusChanges: specChanges,
    handoff,
    synthesis,
    costReport,
    agentReport,
    sliceProgress,
    validationGate,
    validationSkippedBadge,
    testAdequacyGate,
    reviewGate: reviewGate ?? null,
    updated_confidence: updatedConfidence?.confidence ?? null,
    updated_confidence_reason: updatedConfidence?.reason ?? null,
    autoMerge: autoMergeResult ?? null,
    nextAction: `Run /loop:slice grade --id ${sliceId} to capture lessons + decisions.`
  };
}

//      auto-rolls to satisfied.
//   5. Return paths + a hint that the agent should run `slice grade` next.
export async function completeSlice(
  repoPath: string,
  sliceId: string,
  opts: Record<string, any> = {}
) {
  const {
    config: cfgIn = null,
    keepFeatureOpen = false,
    forceClose = false,
    skipValidationCheck = null,
    noDocWriter = false,
    builderEvidence = null as BuilderEvidence | null,
    noMerge = false,
    dryRun = false,
    skipSimplify = false
  } = opts;

  warnDeprecatedDocWriter(noDocWriter);
  if (!sliceId) throw new Error("completeSlice requires a sliceId.");

  const resolved = cfgIn ?? (await resolveConfig(repoPath));
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);

  const [sliceFile, testAdequacyGate] = await Promise.all([
    locateSliceFile(slicesRoot, sliceId),
    deriveTestAdequacyGate(repoPath, sliceId, resolved)
  ]);
  if (!sliceFile) throw new Error(`Slice file not found for ${sliceId} under ${slicesRoot}`);

  const workflowState = await readCrewWorkflowState(repoPath);

  const { sliceContent, sliceFm, featureId, phase, today, startedAt, blockingGates } =
    await resolveSliceContext(repoPath, sliceFile, workflowState);

  const { validationGate, validationSkippedBadge } = await resolveValidationGate(
    repoPath,
    sliceId,
    sliceFm,
    skipValidationCheck,
    resolved
  );

  // P1.4: verdict-aware review gate (SLICE-174 fix) — a rejected review holds
  // FEAT→done promotion via the same soft-block architecture as validation.
  const { deriveReviewGate } = await import("../review-gate.mjs");
  const reviewGate = await deriveReviewGate(repoPath, sliceId, { sliceFm });

  const targetSlicePath = await moveAndStampSlice({
    sliceFile,
    sliceFm,
    today,
    repoPath,
    config: resolved
  });
  const featureResult = await computeFeatureResult(
    repoPath,
    featureId,
    blockingGates,
    resolved,
    sliceId,
    keepFeatureOpen,
    forceClose,
    validationGate,
    testAdequacyGate,
    reviewGate
  );

  await maybeRunFeatureSimplify(
    repoPath,
    featureId,
    sliceId,
    startedAt,
    featureResult,
    skipSimplify as boolean
  );

  const { reconcileSpecStatus } = await import("../linkage.mjs");
  const specChanges = await reconcileSpecStatus(repoPath, resolved);

  const { handoff, synthesis, costReport, agentReport, sliceProgress } =
    await writeCeremonyArtifacts(repoPath, {
      sliceId,
      featureId,
      phase,
      featureResult,
      specChanges,
      targetSlicePath,
      startedAt,
      resolved
    });

  await recordCompleteTrajectory(repoPath, sliceId, featureId, featureResult, validationGate);
  void recordSliceCompleteEvent(repoPath, sliceId, featureId);
  void writeDocWriterSkipAuditLog(repoPath);
  await recordSerialReviewerWarning(repoPath, sliceId, resolved);

  const autoMergeResult = await runAutoMergeStage(repoPath, sliceId, sliceFm, resolved, {
    noMerge,
    dryRun,
    validationGate,
    workflowState,
    sliceTitle: resolveSliceTitle(sliceFm, sliceContent, sliceId)
  });

  return buildCompleteResult({
    sliceId,
    sliceFile,
    targetSlicePath,
    featureResult,
    specChanges,
    handoff,
    synthesis,
    costReport,
    agentReport,
    sliceProgress,
    validationGate,
    validationSkippedBadge,
    testAdequacyGate,
    reviewGate,
    builderEvidence,
    autoMergeResult
  });
}

/** Emit deprecation warning for --no-doc-writer flag. Extracted to keep completeSlice complexity ≤ 15. */
function warnDeprecatedDocWriter(noDocWriter: boolean): void {
  if (noDocWriter) {
    console.error(
      "[slice complete] --no-doc-writer is deprecated and now a no-op (see DEC-011). " +
        "Doc-writer auto-dispatch is already removed."
    );
  }
}

// Writes an audit log entry recording that slice-complete ran without doc-writer
// dispatch (DEC-011: CLI auto-dispatch removed; slash flow is the contract).
// Fire-and-forget — never throws, never blocks completeSlice.
async function writeDocWriterSkipAuditLog(repoPath: string): Promise<void> {
  try {
    const { appendAuditLog } = await import("../auto-dispatch.mjs");
    await appendAuditLog(repoPath, {
      timestamp: new Date().toISOString(),
      agent: "crew:document-writer",
      parentCommand: "slice-complete",
      ok: true,
      skipped: true,
      skipReason: "cli-refusal-cli-doc-writer-disabled",
      durationMs: 0
    });
  } catch {
    // best-effort — never blocks slice complete
  }
}

// Append a badge to the slice file's frontmatter `badges` array.
// Idempotent: returns early when the badge already exists. Best-effort —
// does nothing when the slice file cannot be located.
async function appendSliceBadge(
  repoPath: string,
  sliceId: string,
  badge: string,
  config: Record<string, any> | null
): Promise<void> {
  const slicesRootDir = resolveSlicesRoot(repoPath, config);
  const sliceFile = await locateSliceFile(slicesRootDir, sliceId);
  if (!sliceFile) return;
  const raw = await fs.readFile(sliceFile, "utf8");
  const { frontmatter } = parseFrontmatter(raw);
  const badges = Array.isArray(frontmatter.badges) ? (frontmatter.badges as string[]).slice() : [];
  if (badges.includes(badge)) return;
  badges.push(badge);
  await updateSliceFrontmatter(sliceFile, { badges }, repoPath, config);
}

// Append a bullet under the grade's "## Surprises" heading (creates it
// when missing). Idempotent — returns early when the exact note text is
// already present. Best-effort: no-op when the grade file has not been
// written yet.
async function appendGradeObservation(
  repoPath: string,
  sliceId: string,
  note: string,
  config: Record<string, any> | null
): Promise<void> {
  const { findGradeFileForSlice } = await import("../grade-parser.mjs");
  const gradeFile = await findGradeFileForSlice(repoPath, sliceId, config);
  if (!gradeFile) return;
  const raw = await fs.readFile(gradeFile, "utf8");
  if (raw.includes(note)) return;
  const marker = "## Surprises";
  const idx = raw.indexOf(marker);
  if (idx === -1) {
    await fs.appendFile(gradeFile, `\n## Surprises\n\n- ${note}\n`);
    return;
  }
  const insertAt = raw.indexOf("\n", idx) + 1;
  const next = raw.slice(0, insertAt) + `\n- ${note}\n` + raw.slice(insertAt);
  await fs.writeFile(gradeFile, next);
}

// Run the serial-reviewer detector after slice close. When the reviewer
// span exceeds the configured threshold, stamp a `serial-reviewer-warning`
// badge on the slice and (if a grade file exists) append a surprise note
// so the parallel-dispatch contract violation surfaces in the next retro.
async function recordSerialReviewerWarning(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
): Promise<void> {
  try {
    const thresholdMs = (config?.reviewers?.serialTimingThresholdMs as number) ?? 90000;
    const detector = await detectSerialReviewer(repoPath, sliceId, { thresholdMs });
    if (!detector.serial) return;
    await appendSliceBadge(repoPath, sliceId, "serial-reviewer-warning", config);
    await appendGradeObservation(
      repoPath,
      sliceId,
      `Reviewer ladder ran serially (span ${detector.spanMs}ms, threshold ${thresholdMs}ms). Parallel contract violated.`,
      config
    );
  } catch {
    // best-effort — never blocks slice complete
  }
}

async function recordCompleteTrajectory(
  repoPath: string,
  sliceId: string,
  featureId: string | null,
  featureResult: Record<string, any> | null,
  validationGate: Record<string, any> | null
) {
  try {
    const { recordStep } = await import("../trajectory-writer.mjs");
    await recordStep(repoPath, sliceId, "slice_complete", {
      featureId: featureId ?? null,
      featureMovedTo: featureResult?.to ?? null,
      validationSatisfied: validationGate?.satisfied ?? null
    });
  } catch {
    // best-effort — never blocks slice complete
  }
}

// ---------------------------------------------------------------------------
// SLICE-64: Auto-merge stage
// ---------------------------------------------------------------------------

/**
 * Auto-merge stage: runs after the existing close ceremony so all artifacts
 * are on disk before the worktree is removed.
 *
 * Skip conditions (returns { skipped: true }):
 *   1. opts.noMerge === true
 *   2. workflow-state.currentRun.worktreePath is null/missing/""
 *   3. Worktree path on disk is missing (operator already cleaned up)
 *   4. Slice branch is missing (operator already merged manually — clears worktreePath)
 *
 * Throws MergeError on any failure, after setting the merge_failed badge.
 */
async function runAutoMergeStage(
  repoPath: string,
  sliceId: string,
  sliceFm: Record<string, any>,
  config: Record<string, any>,
  opts: {
    noMerge?: boolean;
    dryRun?: boolean;
    validationGate?: any;
    workflowState?: Awaited<ReturnType<typeof readCrewWorkflowState>>;
    sliceTitle?: string;
  }
): Promise<MergeResult | DryRunPlan | { skipped: true; reason: string } | null> {
  const { noMerge = false, dryRun = false, workflowState } = opts;

  if (noMerge) return { skipped: true, reason: "no-merge-flag" };

  const skipOrPaths = await resolveWorktreeAndBranch(repoPath, sliceId, sliceFm, workflowState);
  if ("skipped" in skipOrPaths) return skipOrPaths;

  const { worktreePath, branchName, featureId } = skipOrPaths;
  const { gradeAvg, decisionIds } = await deriveGradeInfo(repoPath, sliceId);

  const { runAutoMerge } = await import("../auto-merge.mjs");
  return runAutoMerge({
    repoPath,
    worktreePath,
    branchName,
    sliceId,
    sliceTitle: opts.sliceTitle ?? sliceFm?.title ?? sliceId,
    featureId,
    gradeAvg,
    decisionIds,
    config,
    dryRun
  });
}

/**
 * Resolve worktree and branch for the merge stage.
 * Returns skip reason when any of conditions 2-4 apply, or the resolved paths.
 */
async function resolveWorktreeAndBranch(
  repoPath: string,
  sliceId: string,
  sliceFm: Record<string, any>,
  cachedWorkflowState?: Awaited<ReturnType<typeof readCrewWorkflowState>>
): Promise<
  | { worktreePath: string; branchName: string; featureId: string | null }
  | { skipped: true; reason: string }
> {
  const workflowState = cachedWorkflowState ?? (await readCrewWorkflowState(repoPath));
  const worktreePath: string | null = workflowState?.currentRun?.worktreePath ?? null;

  if (!worktreePath || worktreePath === "") {
    return { skipped: true, reason: "no-worktree" };
  }

  const featureId: string | null = sliceFm?.feature ?? null;
  const branchName: string = featureId ? `slice/${sliceId}-${featureId}` : `slice/${sliceId}`;

  const [worktreeExists, branchExists] = await Promise.all([
    checkWorktreeExists(worktreePath),
    checkBranchExists(repoPath, branchName)
  ]);

  if (!worktreeExists) {
    return { skipped: true, reason: "worktree-missing-on-disk" };
  }
  if (!branchExists) {
    await clearWorktreePathInState(repoPath);
    return { skipped: true, reason: "branch-already-merged" };
  }

  return { worktreePath, branchName, featureId };
}

/** Check whether a worktree path exists on disk. */
async function checkWorktreeExists(worktreePath: string): Promise<boolean> {
  try {
    const fsModule = await import("node:fs/promises");
    await fsModule.access(worktreePath);
    return true;
  } catch {
    return false;
  }
}

/** Check whether a git branch exists in the repo. */
async function checkBranchExists(repoPath: string, branchName: string): Promise<boolean> {
  try {
    const { execFile: execFileCb } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFile = promisify(execFileCb);
    await execFile("git", ["-C", repoPath, "rev-parse", "--verify", branchName], {
      timeout: 30_000
    });
    return true;
  } catch {
    return false;
  }
}

/** Derive grade info (gradeAvg + decisionIds) from the grade file. Best-effort: returns nulls on failure. */
async function deriveGradeInfo(
  repoPath: string,
  sliceId: string
): Promise<{ gradeAvg: number | null; decisionIds: string[] }> {
  try {
    const { findGradeForSlice, SCORE_DIMENSIONS } = await import("../grade-parser.mjs");
    const grade = await findGradeForSlice(repoPath, sliceId);
    if (!grade) return { gradeAvg: null, decisionIds: [] };
    const scores = grade.scores ?? {};
    const vals = SCORE_DIMENSIONS.map((d) => scores[d]).filter((v) => typeof v === "number");
    const gradeAvg =
      vals.length > 0
        ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
        : null;
    const decisionIds = Array.isArray(grade?.frontmatter?.decisions)
      ? grade.frontmatter.decisions
      : [];
    return { gradeAvg, decisionIds };
  } catch {
    return { gradeAvg: null, decisionIds: [] };
  }
}

async function emitGateTransitionEvents(
  repoPath: string,
  sliceId: string,
  featureId: string | null,
  gates: {
    isBlocked: boolean;
    isSimplifyBlocked: boolean;
    isValidationBlocked: boolean;
    isTestAdequacyBlocked: boolean;
    isReviewBlocked?: boolean;
  }
): Promise<void> {
  try {
    const { appendSliceEvent } = await import("../slice-events.mjs");
    const ts = new Date().toISOString();
    const base = { sliceId, featureId, timestamp: ts };
    await appendSliceEvent(repoPath, sliceId, {
      type: "gate_transition",
      ...base,
      gate: "review",
      from: null,
      to: gates.isReviewBlocked ? "failed" : "passed"
    });
    await appendSliceEvent(repoPath, sliceId, {
      type: "gate_transition",
      ...base,
      gate: "blocked",
      from: null,
      to: gates.isBlocked ? "failed" : "passed"
    });
    await appendSliceEvent(repoPath, sliceId, {
      type: "gate_transition",
      ...base,
      gate: "validation",
      from: null,
      to: gates.isValidationBlocked ? "failed" : "passed"
    });
    await appendSliceEvent(repoPath, sliceId, {
      type: "gate_transition",
      ...base,
      gate: "test-adequacy",
      from: null,
      to: gates.isTestAdequacyBlocked ? "failed" : "passed"
    });
    await appendSliceEvent(repoPath, sliceId, {
      type: "gate_transition",
      ...base,
      gate: "simplify",
      from: null,
      to: gates.isSimplifyBlocked ? "failed" : "passed"
    });
  } catch (err) {
    console.warn(
      `[slice-events] gate-events failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function recordSliceCompleteEvent(
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
      from: "building",
      to: "done"
    });
  } catch (err) {
    console.warn(
      `[slice-events] complete-event failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function maybeRunFeatureSimplify(
  repoPath: string,
  featureId: string | null,
  sliceId: string,
  startedAt: string | null,
  featureResult: Record<string, any> | null,
  skipSimplify: boolean
): Promise<void> {
  const fr = featureResult;
  if (!fr || fr["skipped"] || fr["to"] !== "done" || !featureId) return;
  void triggerFeatureSimplify(repoPath, featureId, sliceId, startedAt, skipSimplify);
}

async function triggerFeatureSimplify(
  repoPath: string,
  featureId: string,
  sliceId: string,
  startedAt: string | null,
  skipSimplify: boolean
): Promise<void> {
  try {
    const { featureSimplify } = await import("./feature-lifecycle.mjs");
    await featureSimplify(repoPath, featureId, {
      skipSimplify,
      sliceId,
      ...(startedAt != null ? { startedAt } : {})
    });
  } catch (err) {
    console.warn(
      `[feature-simplify] failed for ${featureId}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// clearWorktreePathInState is imported from ../auto-merge.mjs to avoid DRY duplication.
