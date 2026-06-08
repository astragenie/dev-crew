import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig } from "../config-resolver.mjs";
import { parseFrontmatter, mergeFrontmatter } from "../frontmatter.mjs";
import { findFeatureById, moveFeature } from "../backlog-writer.mjs";
import { readCrewWorkflowState } from "../crew-workflow-reader.mjs";
import { readFeatureEndCeremony } from "../ceremonies.mjs";
import { markValidationSkippedBadge, tryWriteAgentReport, tryWriteCostReport, writeCrewFinalSynthesis, writeCrewHandoff } from "./crew-bridge.mjs";
import { computePostBuilderConfidence } from "../confidence-signal.mjs";
import { deriveValidationGate } from "../validation-gate.mjs";
import { deriveTestAdequacyGate } from "../test-adequacy-gate.mjs";
import { findActivePlan, detectSliceStatus, writeSliceProgress } from "./slice-progress.mjs";
import { locateSliceFile, slicesRoot as resolveSlicesRoot, ensureDir } from "../paths.mjs";
import { clearWorktreePathInState } from "../auto-merge.mjs";
function deriveBlockingGates(workflowState) {
    const gates = workflowState?.currentRun?.gates || {};
    const blocked = gates.blocked?.status === "blocked" ? gates.blocked : null;
    const escalated = gates.escalation?.status === "escalated" ? gates.escalation : null;
    return { blocked, escalated };
}
async function bestEffort(fn) {
    try {
        return await fn();
    }
    catch (err) {
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
    if (targetSlicePath !== sliceFile)
        await fs.unlink(sliceFile);
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
    if (!featureId)
        return null;
    const feat = await findFeatureById(repoPath, featureId, config);
    if (!feat)
        return null;
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
function describeBlockedGate({ isBlocked, isSimplifyBlocked, blockingGates, validationGate, testAdequacyGate }) {
    if (isBlocked) {
        return blockingGates.escalated
            ? `crew run escalated_to_human: ${blockingGates.escalated.note || ""}`
            : `crew run blocked: ${blockingGates.blocked?.note || ""}`;
    }
    if (isSimplifyBlocked) {
        return "simplify-gate: featureEnd ceremony exists but simplifyRan is false";
    }
    if (testAdequacyGate?.satisfied === false)
        return testAdequacyGate.reason;
    return `validation-gate: ${validationGate?.reason ?? "no evidence"}`;
}
async function evaluateFeatureGates(repoPath, sliceId, featureId, blockingGates, validationGate, testAdequacyGate) {
    const isBlocked = Boolean(blockingGates.blocked || blockingGates.escalated);
    const simplifyCeremony = featureId ? await readFeatureEndCeremony(repoPath, featureId) : null;
    const isSimplifyBlocked = Boolean(simplifyCeremony && simplifyCeremony.simplifyRan === false);
    const isValidationBlocked = Boolean(validationGate && validationGate.satisfied === false);
    const isTestAdequacyBlocked = Boolean(testAdequacyGate && testAdequacyGate.satisfied === false);
    void emitGateTransitionEvents(repoPath, sliceId, featureId, {
        isBlocked,
        isSimplifyBlocked,
        isValidationBlocked,
        isTestAdequacyBlocked
    });
    return { isBlocked, isSimplifyBlocked, isValidationBlocked, isTestAdequacyBlocked };
}
// Appends sliceId to the FEAT's slices_complete array (dedupe), writes back
// the updated frontmatter. Returns { slicesComplete, remainingSlices }.
async function updateSlicesComplete(feat, sliceId) {
    const planned = Array.isArray(feat.frontmatter?.slices)
        ? [...feat.frontmatter.slices]
        : [];
    const existing = Array.isArray(feat.frontmatter?.slices_complete)
        ? [...feat.frontmatter.slices_complete]
        : [];
    const slicesComplete = existing.includes(sliceId) ? existing : [...existing, sliceId];
    const remainingSlices = planned.filter((s) => !slicesComplete.includes(s));
    // Write back to FEAT file
    const content = await fs.readFile(feat.filePath, "utf8");
    const updated = mergeFrontmatter(content, { slices_complete: slicesComplete });
    await fs.writeFile(feat.filePath, updated);
    return { slicesComplete, remainingSlices };
}
// Applies multi-slice detection for a FEAT that has a non-empty slices array.
// Returns a result object to short-circuit computeFeatureResult, or null to
// fall through to the default moveFeatureToDone path.
async function applyMultiSliceLogic(_repoPath, feat, featureId, sliceId, keepFeatureOpen, forceClose, _config) {
    const planned = Array.isArray(feat.frontmatter?.slices)
        ? [...feat.frontmatter.slices]
        : [];
    if (planned.length === 0)
        return null;
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
function buildBlockedResult(gateState, blockingGates, validationGate, testAdequacyGate) {
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
async function computeFeatureResult(repoPath, featureId, blockingGates, config, sliceId, keepFeatureOpen = false, forceClose = false, validationGate = null, testAdequacyGate = null) {
    const gateState = await evaluateFeatureGates(repoPath, sliceId, featureId, blockingGates, validationGate, testAdequacyGate);
    const { isBlocked, isSimplifyBlocked, isValidationBlocked, isTestAdequacyBlocked } = gateState;
    if (isBlocked || isSimplifyBlocked || isValidationBlocked || isTestAdequacyBlocked) {
        return buildBlockedResult(gateState, blockingGates, validationGate, testAdequacyGate);
    }
    if (featureId) {
        const feat = await findFeatureById(repoPath, featureId, config);
        if (feat && feat.state !== "done") {
            const multiSliceResult = await applyMultiSliceLogic(repoPath, feat, featureId, sliceId, keepFeatureOpen, forceClose, config);
            if (multiSliceResult !== null)
                return multiSliceResult;
        }
    }
    return await moveFeatureToDone(repoPath, featureId, config, keepFeatureOpen);
}
// Resolves the validation gate: --skip-validation-check writes a
// validation_skipped badge first so the bypass is auditable, then shortcuts
// the gate to satisfied. Otherwise derives from artifacts / badges / waiver.
async function resolveValidationGate(repoPath, sliceId, sliceFm, skipValidationCheck) {
    if (!skipValidationCheck) {
        const validationGate = await deriveValidationGate(repoPath, sliceId, { sliceFm });
        return { validationGate, validationSkippedBadge: null };
    }
    const reason = String(skipValidationCheck).trim();
    if (!reason) {
        throw new Error("--skip-validation-check requires a non-empty reason. " +
            "Example: --skip-validation-check 'doc-only slice, no behavior'.");
    }
    const validationSkippedBadge = await bestEffort(() => markValidationSkippedBadge(repoPath, reason));
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
async function writeCeremonyArtifacts(repoPath, { sliceId, featureId, phase, featureResult, specChanges, targetSlicePath, startedAt, resolved }) {
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
        bestEffort(() => tryWriteAgentReport(repoPath, {
            sliceId,
            featureId,
            ...(phase !== undefined ? { phase } : {}),
            startedAt
        }))
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
function buildCompleteResult({ sliceId, sliceFile, targetSlicePath, featureResult, specChanges, handoff, synthesis, costReport, agentReport, sliceProgress, validationGate, validationSkippedBadge, testAdequacyGate, builderEvidence, autoMergeResult }) {
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
        autoMerge: autoMergeResult ?? null,
        nextAction: `Run /loop:slice grade --id ${sliceId} to capture lessons + decisions.`
    };
}
//      auto-rolls to satisfied.
//   5. Return paths + a hint that the agent should run `slice grade` next.
export async function completeSlice(repoPath, sliceId, opts = {}) {
    const { config: cfgIn = null, keepFeatureOpen = false, forceClose = false, skipValidationCheck = null, noDocWriter = false, builderEvidence = null, noMerge = false, dryRun = false, skipSimplify = false } = opts;
    warnDeprecatedDocWriter(noDocWriter);
    if (!sliceId)
        throw new Error("completeSlice requires a sliceId.");
    const resolved = cfgIn ?? (await resolveConfig(repoPath));
    const slicesRoot = resolveSlicesRoot(repoPath, resolved);
    const [sliceFile, testAdequacyGate] = await Promise.all([
        locateSliceFile(slicesRoot, sliceId),
        deriveTestAdequacyGate(repoPath, sliceId, resolved)
    ]);
    if (!sliceFile)
        throw new Error(`Slice file not found for ${sliceId} under ${slicesRoot}`);
    const { sliceContent, sliceFm, featureId, phase, today, startedAt, blockingGates } = await resolveSliceContext(repoPath, sliceFile);
    const { validationGate, validationSkippedBadge } = await resolveValidationGate(repoPath, sliceId, sliceFm, skipValidationCheck);
    const targetSlicePath = await moveAndStampSlice({
        sliceFile,
        sliceContent,
        sliceFm,
        slicesRoot,
        today
    });
    const featureResult = await computeFeatureResult(repoPath, featureId, blockingGates, resolved, sliceId, keepFeatureOpen, forceClose, validationGate, testAdequacyGate);
    await maybeRunFeatureSimplify(repoPath, featureId, sliceId, startedAt, featureResult, skipSimplify);
    const { reconcileSpecStatus } = await import("../linkage.mjs");
    const specChanges = await reconcileSpecStatus(repoPath, resolved);
    const { handoff, synthesis, costReport, agentReport, sliceProgress } = await writeCeremonyArtifacts(repoPath, {
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
    const autoMergeResult = await runAutoMergeStage(repoPath, sliceId, sliceFm, resolved, {
        noMerge,
        dryRun,
        validationGate
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
        builderEvidence,
        autoMergeResult
    });
}
/** Emit deprecation warning for --no-doc-writer flag. Extracted to keep completeSlice complexity ≤ 15. */
function warnDeprecatedDocWriter(noDocWriter) {
    if (noDocWriter) {
        console.error("[slice complete] --no-doc-writer is deprecated and now a no-op (see DEC-011). " +
            "Doc-writer auto-dispatch is already removed.");
    }
}
// Writes an audit log entry recording that slice-complete ran without doc-writer
// dispatch (DEC-011: CLI auto-dispatch removed; slash flow is the contract).
// Fire-and-forget — never throws, never blocks completeSlice.
async function writeDocWriterSkipAuditLog(repoPath) {
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
    }
    catch {
        // best-effort — never blocks slice complete
    }
}
async function recordCompleteTrajectory(repoPath, sliceId, featureId, featureResult, validationGate) {
    try {
        const { recordStep } = await import("../trajectory-writer.mjs");
        await recordStep(repoPath, sliceId, "slice_complete", {
            featureId: featureId ?? null,
            featureMovedTo: featureResult?.to ?? null,
            validationSatisfied: validationGate?.satisfied ?? null
        });
    }
    catch {
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
async function runAutoMergeStage(repoPath, sliceId, sliceFm, config, opts) {
    const { noMerge = false, dryRun = false } = opts;
    if (noMerge)
        return { skipped: true, reason: "no-merge-flag" };
    const skipOrPaths = await resolveWorktreeAndBranch(repoPath, sliceId, sliceFm);
    if ("skipped" in skipOrPaths)
        return skipOrPaths;
    const { worktreePath, branchName, featureId } = skipOrPaths;
    const { gradeAvg, decisionIds } = await deriveGradeInfo(repoPath, sliceId);
    const { runAutoMerge } = await import("../auto-merge.mjs");
    return runAutoMerge({
        repoPath,
        worktreePath,
        branchName,
        sliceId,
        sliceTitle: sliceFm?.title ?? sliceId,
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
async function resolveWorktreeAndBranch(repoPath, sliceId, sliceFm) {
    const workflowState = await readCrewWorkflowState(repoPath);
    const worktreePath = workflowState?.currentRun?.worktreePath ?? null;
    if (!worktreePath || worktreePath === "") {
        return { skipped: true, reason: "no-worktree" };
    }
    const featureId = sliceFm?.feature ?? null;
    const branchName = featureId ? `slice/${sliceId}-${featureId}` : `slice/${sliceId}`;
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
async function checkWorktreeExists(worktreePath) {
    try {
        const fsModule = await import("node:fs/promises");
        await fsModule.access(worktreePath);
        return true;
    }
    catch {
        return false;
    }
}
/** Check whether a git branch exists in the repo. */
async function checkBranchExists(repoPath, branchName) {
    try {
        const { execFile: execFileCb } = await import("node:child_process");
        const { promisify } = await import("node:util");
        const execFile = promisify(execFileCb);
        await execFile("git", ["-C", repoPath, "rev-parse", "--verify", branchName]);
        return true;
    }
    catch {
        return false;
    }
}
/** Derive grade info (gradeAvg + decisionIds) from the grade file. Best-effort: returns nulls on failure. */
async function deriveGradeInfo(repoPath, sliceId) {
    try {
        const { findGradeForSlice, SCORE_DIMENSIONS } = await import("../grade-parser.mjs");
        const grade = await findGradeForSlice(repoPath, sliceId);
        if (!grade)
            return { gradeAvg: null, decisionIds: [] };
        const scores = grade.scores ?? {};
        const vals = SCORE_DIMENSIONS.map((d) => scores[d]).filter((v) => typeof v === "number");
        const gradeAvg = vals.length > 0
            ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
            : null;
        const decisionIds = Array.isArray(grade?.frontmatter?.decisions)
            ? grade.frontmatter.decisions
            : [];
        return { gradeAvg, decisionIds };
    }
    catch {
        return { gradeAvg: null, decisionIds: [] };
    }
}
async function emitGateTransitionEvents(repoPath, sliceId, featureId, gates) {
    try {
        const { appendSliceEvent } = await import("../slice-events.mjs");
        const ts = new Date().toISOString();
        const base = { sliceId, featureId, timestamp: ts };
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
    }
    catch (err) {
        console.warn(`[slice-events] gate-events failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function recordSliceCompleteEvent(repoPath, sliceId, featureId) {
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
    }
    catch (err) {
        console.warn(`[slice-events] complete-event failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function maybeRunFeatureSimplify(repoPath, featureId, sliceId, startedAt, featureResult, skipSimplify) {
    const fr = featureResult;
    if (!fr || fr["skipped"] || fr["to"] !== "done" || !featureId)
        return;
    void triggerFeatureSimplify(repoPath, featureId, sliceId, startedAt, skipSimplify);
}
async function triggerFeatureSimplify(repoPath, featureId, sliceId, startedAt, skipSimplify) {
    try {
        const { featureSimplify } = await import("./feature-lifecycle.mjs");
        await featureSimplify(repoPath, featureId, {
            skipSimplify,
            sliceId,
            ...(startedAt != null ? { startedAt } : {})
        });
    }
    catch (err) {
        console.warn(`[feature-simplify] failed for ${featureId}: ${err instanceof Error ? err.message : String(err)}`);
    }
}
// clearWorktreePathInState is imported from ../auto-merge.mjs to avoid DRY duplication.
