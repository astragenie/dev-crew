import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig } from "../config-resolver.mjs";
import { parseFrontmatter, mergeFrontmatter } from "../frontmatter.mjs";
import { findFeatureById, moveFeature } from "../backlog-writer.mjs";
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
import { locateSliceFile, slicesRoot as resolveSlicesRoot, ensureDir } from "../paths.mjs";
import type { DrainOpts, DrainResult } from "../marker-drain.mjs";

type DrainFn = (repoPath: string, opts?: DrainOpts) => Promise<DrainResult>;

function deriveBlockingGates(workflowState) {
  const gates = workflowState?.currentRun?.gates || {};
  const blocked = gates.blocked?.status === "blocked" ? gates.blocked : null;
  const escalated = gates.escalation?.status === "escalated" ? gates.escalation : null;
  return { blocked, escalated };
}

async function bestEffort(fn) {
  try {
    return await fn();
  } catch (err) {
    return { error: err.message };
  }
}

// Decides the target path (pending/active/in-progress -> completed; else
// flat), stamps frontmatter, writes the updated file, removes the old one
// if it moved. Returns the new path.
async function moveAndStampSlice({ sliceFile, sliceContent, sliceFm, slicesRoot, today }) {
  const parentDir = path.basename(path.dirname(sliceFile));
  let targetSlicePath = sliceFile;
  if (parentDir === "pending" || parentDir === "active" || parentDir === "in-progress") {
    const completedDir = path.join(slicesRoot, "completed");
    await ensureDir(completedDir);
    targetSlicePath = path.join(completedDir, path.basename(sliceFile));
  }
  const updated = mergeFrontmatter(sliceContent, {
    status: "completed",
    completed_at: sliceFm.completed_at || today,
    updated: today
  });
  await fs.writeFile(targetSlicePath, updated);
  if (targetSlicePath !== sliceFile) await fs.unlink(sliceFile);
  return targetSlicePath;
}

// Moves the slice's linked feature to done/ when present and not yet done.
// Returns null when there is no linked feature, or a result object
// describing the move (or the alreadyDone or kept-open case).
//
// Skips the move when:
//   - feat.frontmatter.feature_complete === false (operator opts out for multi-slice features)
//   - keepFeatureOpen === true (runtime CLI override via --keep-feature-open)
async function moveFeatureToDone(repoPath, featureId, config, keepFeatureOpen = false) {
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
  testAdequacyGate
}) {
  if (isBlocked) {
    return blockingGates.escalated
      ? `crew run escalated_to_human: ${blockingGates.escalated.note || ""}`
      : `crew run blocked: ${blockingGates.blocked?.note || ""}`;
  }
  if (isSimplifyBlocked) {
    return "simplify-gate: featureEnd ceremony exists but simplifyRan is false";
  }
  if (testAdequacyGate?.satisfied === false) return testAdequacyGate.reason;
  return `validation-gate: ${validationGate.reason}`;
}

async function evaluateFeatureGates(
  repoPath,
  featureId,
  blockingGates,
  validationGate,
  testAdequacyGate
) {
  const isBlocked = Boolean(blockingGates.blocked || blockingGates.escalated);
  const simplifyCeremony = await readFeatureEndCeremony(repoPath, featureId);
  const isSimplifyBlocked = Boolean(simplifyCeremony && simplifyCeremony.simplifyRan === false);
  const isValidationBlocked = Boolean(validationGate && validationGate.satisfied === false);
  const isTestAdequacyBlocked = Boolean(testAdequacyGate && testAdequacyGate.satisfied === false);
  return { isBlocked, isSimplifyBlocked, isValidationBlocked, isTestAdequacyBlocked };
}

// Appends sliceId to the FEAT's slices_complete array (dedupe), writes back
// the updated frontmatter. Returns { slicesComplete, remainingSlices }.
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

  // Write back to FEAT file
  const content = await fs.readFile(feat.filePath, "utf8");
  const updated = mergeFrontmatter(content, { slices_complete: slicesComplete });
  await fs.writeFile(feat.filePath, updated);

  return { slicesComplete, remainingSlices };
}

// Applies multi-slice detection for a FEAT that has a non-empty slices array.
// Returns a result object to short-circuit computeFeatureResult, or null to
// fall through to the default moveFeatureToDone path.
async function applyMultiSliceLogic(
  _repoPath,
  feat: any,
  featureId: string,
  sliceId: string,
  keepFeatureOpen: boolean,
  forceClose: boolean,
  _config
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
  },
  blockingGates,
  validationGate,
  testAdequacyGate
) {
  const { isBlocked, isSimplifyBlocked, isValidationBlocked, isTestAdequacyBlocked } = gateState;
  return {
    skipped: true,
    reason: describeBlockedGate({
      isBlocked,
      isSimplifyBlocked,
      blockingGates,
      validationGate,
      testAdequacyGate
    }),
    blockingGates: isBlocked ? blockingGates : null,
    simplifyGate: isSimplifyBlocked ? { simplifyRan: false } : null,
    validationGate: isValidationBlocked ? validationGate : null,
    testAdequacyGate: isTestAdequacyBlocked ? testAdequacyGate : null
  };
}

async function computeFeatureResult(
  repoPath,
  featureId,
  blockingGates,
  config,
  sliceId: string,
  keepFeatureOpen = false,
  forceClose = false,
  validationGate = null as any,
  testAdequacyGate = null as any
) {
  const gateState = await evaluateFeatureGates(
    repoPath,
    featureId,
    blockingGates,
    validationGate,
    testAdequacyGate
  );

  const { isBlocked, isSimplifyBlocked, isValidationBlocked, isTestAdequacyBlocked } = gateState;
  if (isBlocked || isSimplifyBlocked || isValidationBlocked || isTestAdequacyBlocked) {
    return buildBlockedResult(gateState, blockingGates, validationGate, testAdequacyGate);
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

// Resolves the validation gate: --skip-validation-check writes a
// validation_skipped badge first so the bypass is auditable, then shortcuts
// the gate to satisfied. Otherwise derives from artifacts / badges / waiver.
async function resolveValidationGate(
  repoPath,
  sliceId,
  sliceFm,
  skipValidationCheck
): Promise<{ validationGate: any; validationSkippedBadge: any }> {
  if (!skipValidationCheck) {
    const validationGate = await deriveValidationGate(repoPath, sliceId, { sliceFm });
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
    evidence: []
  };
  return { validationGate, validationSkippedBadge };
}

// Reads slice file, parses frontmatter, and resolves workflow state. Extracted
// to keep completeSlice under the complexity budget.
async function resolveSliceContext(repoPath, sliceFile) {
  const sliceContent = await fs.readFile(sliceFile, "utf8");
  const { frontmatter: sliceFm } = parseFrontmatter(sliceContent);
  const featureId = sliceFm.feature || null;
  const phase = sliceFm.phase || null;
  const today = new Date().toISOString().slice(0, 10);
  const workflowState = await readCrewWorkflowState(repoPath);
  const startedAt = workflowState?.currentRun?.startedAt ?? null;
  const blockingGates = deriveBlockingGates(workflowState);
  return { sliceContent, sliceFm, featureId, phase, today, startedAt, blockingGates };
}

// Writes all best-effort ceremony artifacts in parallel. Extracted to keep
// completeSlice under the complexity budget.
async function writeCeremonyArtifacts(
  repoPath,
  { sliceId, featureId, phase, featureResult, specChanges, targetSlicePath, startedAt, resolved }
) {
  const crewArgs = {
    sliceId,
    slicePath: targetSlicePath,
    featureId,
    phase,
    featureResult,
    specChanges,
    config: resolved
  };

  const [handoff, synthesis, costReport, agentReport] = await Promise.all([
    bestEffort(() => writeCrewHandoff(repoPath, crewArgs)),
    bestEffort(() => writeCrewFinalSynthesis(repoPath, crewArgs)),
    bestEffort(() => tryWriteCostReport(repoPath, { sliceId, featureId, phase }, resolved)),
    bestEffort(() => tryWriteAgentReport(repoPath, { sliceId, featureId, phase, startedAt }))
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
  builderEvidence
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
  builderEvidence: BuilderEvidence | null;
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
    updated_confidence: updatedConfidence?.confidence ?? null,
    updated_confidence_reason: updatedConfidence?.reason ?? null,
    nextAction: `Run /loop:slice grade --id ${sliceId} to capture lessons + decisions.`
  };
}

//      auto-rolls to satisfied.
//   5. Return paths + a hint that the agent should run `slice grade` next.
export async function completeSlice(repoPath, sliceId, opts: Record<string, any> = {}) {
  const {
    config = null,
    keepFeatureOpen = false,
    forceClose = false,
    skipValidationCheck = null,
    noMarkerDrain = false,
    noDocWriter = false,
    drainFn = undefined,
    builderEvidence = null as BuilderEvidence | null
  } = opts;

  if (noDocWriter) {
    console.error(
      "[slice complete] --no-doc-writer is deprecated and now a no-op (see DEC-011). " +
        "Doc-writer auto-dispatch is already removed."
    );
  }
  if (!sliceId) throw new Error("completeSlice requires a sliceId.");
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);

  // Locate slice file recursively
  const sliceFile = await locateSliceFile(slicesRoot, sliceId);
  if (!sliceFile) throw new Error(`Slice file not found for ${sliceId} under ${slicesRoot}`);

  const { sliceContent, sliceFm, featureId, phase, today, startedAt, blockingGates } =
    await resolveSliceContext(repoPath, sliceFile);

  const { validationGate, validationSkippedBadge } = await resolveValidationGate(
    repoPath,
    sliceId,
    sliceFm,
    skipValidationCheck
  );

  const testAdequacyGate = await deriveTestAdequacyGate(repoPath, sliceId, resolved);

  const targetSlicePath = await moveAndStampSlice({
    sliceFile,
    sliceContent,
    sliceFm,
    slicesRoot,
    today
  });
  const featureResult = await computeFeatureResult(
    repoPath,
    featureId,
    blockingGates,
    config,
    sliceId,
    keepFeatureOpen,
    forceClose,
    validationGate,
    testAdequacyGate
  );

  // Reconcile parent spec status
  const { reconcileSpecStatus } = await import("../linkage.mjs");
  const specChanges = await reconcileSpecStatus(repoPath, config);

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

  // Doc-writer auto-dispatch removed (DEC-011). Slash flow is the contract.
  // Write audit log entry so retros can see the slice closed without doc-writer dispatch.
  void writeDocWriterSkipAuditLog(repoPath);

  // Drain stale pending-dispatch markers — async / fire-and-forget. Must not
  // block the close ceremony. Drain failure is isolated via audit log.
  fireMarkerDrain(repoPath, { noMarkerDrain, drainFn });

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
    builderEvidence
  });
}

// Writes an audit log entry recording that slice-complete ran without doc-writer
// dispatch (DEC-011: CLI auto-dispatch removed; slash flow is the contract).
// Fire-and-forget — never throws, never blocks completeSlice.
async function writeDocWriterSkipAuditLog(repoPath: string): Promise<void> {
  try {
    const { appendAuditLog } = await import("../auto-dispatch.mjs");
    await appendAuditLog(repoPath, {
      timestamp: new Date().toISOString(),
      agent: "loop:document-writer",
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

// Fires the marker-drain step asynchronously (fire-and-forget). Never throws —
// all failures are recorded in the audit log. Returns void immediately so the
// close ceremony is not blocked.
function fireMarkerDrain(
  repoPath: string,
  opts: { noMarkerDrain?: boolean; drainFn?: DrainFn }
): void {
  const { noMarkerDrain = false, drainFn } = opts;

  const work = async () => {
    const { appendAuditLog, parseSkipFlag } = await import("../auto-dispatch.mjs");
    const argv = noMarkerDrain ? ["--no-marker-drain"] : [];

    if (parseSkipFlag(argv, "--no-marker-drain")) {
      await appendAuditLog(repoPath, {
        timestamp: new Date().toISOString(),
        agent: "system:marker-drain",
        parentCommand: "slice-complete",
        ok: true,
        skipped: true,
        skipReason: "opt-out",
        durationMs: 0
      });
      return;
    }

    const { drainPendingDispatchMarkers } = await import("../marker-drain.mjs");
    const effectiveDrain: DrainFn = drainFn ?? drainPendingDispatchMarkers;
    await effectiveDrain(repoPath);
  };

  work().catch(async (err) => {
    try {
      const { appendAuditLog } = await import("../auto-dispatch.mjs");
      await appendAuditLog(repoPath, {
        timestamp: new Date().toISOString(),
        agent: "system:marker-drain",
        parentCommand: "slice-complete",
        ok: false,
        skipped: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: 0
      });
    } catch {
      // Absolute last-resort: never propagate from the catch handler.
    }
  });
}

async function recordCompleteTrajectory(
  repoPath,
  sliceId,
  featureId,
  featureResult,
  validationGate
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
