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
import { deriveValidationGate } from "../validation-gate.mjs";
import { deriveTestAdequacyGate } from "../test-adequacy-gate.mjs";
import { findActivePlan, detectSliceStatus, writeSliceProgress } from "./slice-progress.mjs";
import { locateSliceFile, slicesRoot as resolveSlicesRoot, ensureDir } from "../paths.mjs";

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

async function evaluateFeatureGates(repoPath, featureId, blockingGates, validationGate, testAdequacyGate) {
  const isBlocked = Boolean(blockingGates.blocked || blockingGates.escalated);
  const simplifyCeremony = await readFeatureEndCeremony(repoPath, featureId);
  const isSimplifyBlocked = Boolean(simplifyCeremony && simplifyCeremony.simplifyRan === false);
  const isValidationBlocked = Boolean(validationGate && validationGate.satisfied === false);
  const isTestAdequacyBlocked = Boolean(testAdequacyGate && testAdequacyGate.satisfied === false);
  return { isBlocked, isSimplifyBlocked, isValidationBlocked, isTestAdequacyBlocked };
}

async function computeFeatureResult(
  repoPath,
  featureId,
  blockingGates,
  config,
  keepFeatureOpen = false,
  validationGate = null as any,
  testAdequacyGate = null as any
) {
  const { isBlocked, isSimplifyBlocked, isValidationBlocked, isTestAdequacyBlocked } =
    await evaluateFeatureGates(repoPath, featureId, blockingGates, validationGate, testAdequacyGate);

  if (isBlocked || isSimplifyBlocked || isValidationBlocked || isTestAdequacyBlocked) {
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

  return await moveFeatureToDone(repoPath, featureId, config, keepFeatureOpen);
}

//      auto-rolls to satisfied.
//   5. Return paths + a hint that the agent should run `slice grade` next.
export async function completeSlice(
  repoPath,
  sliceId,
  { config = null, keepFeatureOpen = false, skipValidationCheck = null }: Record<string, any> = {}
) {
  if (!sliceId) throw new Error("completeSlice requires a sliceId.");
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);

  // Locate slice file recursively
  const sliceFile = await locateSliceFile(slicesRoot, sliceId);
  if (!sliceFile) throw new Error(`Slice file not found for ${sliceId} under ${slicesRoot}`);

  const sliceContent = await fs.readFile(sliceFile, "utf8");
  const { frontmatter: sliceFm } = parseFrontmatter(sliceContent);
  const featureId = sliceFm.feature || null;
  const phase = sliceFm.phase || null;
  const today = new Date().toISOString().slice(0, 10);

  // FEAT-002: refuse to roll the parent feature to done/ while the crew
  // workflow run is blocked or escalated_to_human. The slice itself can
  // still complete (move + stamp), but the feature transition waits for
  // the human to clear the gate.
  const workflowState = await readCrewWorkflowState(repoPath);
  const startedAt = workflowState?.currentRun?.startedAt ?? null;
  const blockingGates = deriveBlockingGates(workflowState);

  // Validation gate: refuse to roll feature to done when no validation
  // artifact / badge / waiver is present. --skip-validation-check writes
  // a validation_skipped badge first so the bypass is auditable, then
  // shortcuts the gate to satisfied.
  let validationGate;
  let validationSkippedBadge: any = null;
  if (skipValidationCheck) {
    const reason = String(skipValidationCheck).trim();
    if (!reason) {
      throw new Error(
        "--skip-validation-check requires a non-empty reason. " +
          "Example: --skip-validation-check 'doc-only slice, no behavior'."
      );
    }
    validationSkippedBadge = await bestEffort(() => markValidationSkippedBadge(repoPath, reason));
    validationGate = {
      satisfied: true,
      reason: `--skip-validation-check: ${reason}`,
      evidence: []
    };
  } else {
    validationGate = await deriveValidationGate(repoPath, sliceId, { sliceFm });
  }

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
    keepFeatureOpen,
    validationGate,
    testAdequacyGate
  );

  // Reconcile parent spec status
  const { reconcileSpecStatus } = await import("../linkage.mjs");
  const specChanges = await reconcileSpecStatus(repoPath, config);

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
    nextAction: `Run /loop:slice grade --id ${sliceId} to capture lessons + decisions.`
  };
}
