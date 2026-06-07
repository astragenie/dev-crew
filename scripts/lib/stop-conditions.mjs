import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { detectPatterns } from "./pattern-alerts.mjs";
import { getIterationStatus } from "./loop-iteration.mjs";
import { countHighSeverityCostAlerts } from "./cost-alert-loader.mjs";
import { readCrewBlockingGates, readCrewWorkflowState } from "./crew-workflow-reader.mjs";
import { checkGradeTrend } from "./grade-trend.mjs";
import { checkSliceCostCeiling } from "./slice-cost-ceiling.mjs";
import { checkCostRegression } from "./cost-regression.mjs";
import { checkSessionDrift } from "./session-drift.mjs";
// Unified stop-condition resolver. Returns a structured verdict:
//   { shouldStop, reasons, blockers, suggestions, iterationCapReached }
// Used by Cross-Slice Continuation HARD RULE (and crew brief) to decide
// whether to roll the next slice or stop the autonomous loop.
//
// Stop conditions (any one triggers shouldStop=true):
//   A. Backlog empty AND no approved-undecomposed specs
//      (Every spec satisfied or in flight → genuine no-work state)
//   B. Severity-warn pattern alerts present (e.g. score-trend regression,
//      in-progress orphan, decomposition explosion)
//      (Bad signal — address before continuing rather than charging ahead)
//   C. Iteration cap reached (legacy mode only — disabled when autoMode)
//      (Runaway halting — loop has completed maxIterations without finishing)
//   D. High-severity cost-advisor alerts fired (cost-alert-high)
//      (Cost is spiraling — halt gracefully and let user review trajectory)
//   E. Crew run blocked or escalated. Escalation always halts; the soft
//      blocked-badge branch is disabled when autoMode (it usually clears
//      on the next iteration).
//
// Auto mode (config.loop.autoMode, default true): loop walks the entire
// backlog. Iteration cap and crew blocked-badge become advisory only —
// counter still increments and snapshot still reports them. Set
// autoMode=false to restore the original five-condition gating.
// config.loop.marathonMode is a deprecated alias accepted for back-compat.
//
// Caller decides what to do with a stop signal:
//   - In autonomous mode: log + halt + ping user
//   - In hand-driven mode: surface in brief
//   - In phase-gate: include in retrospective + handoff
function computeBacklogStats(backlog, specs) {
    const pendingOrTriaged = filterBacklog(backlog, { status: "pending" }).length +
        filterBacklog(backlog, { status: "triaged" }).length;
    const inProgress = filterBacklog(backlog, { status: "in-progress" }).length;
    const approvedUndecomposed = specs.filter((s) => s.frontmatter.status === "approved" &&
        (!Array.isArray(s.frontmatter.derived_features) ||
            s.frontmatter.derived_features.length === 0)).length;
    return { pendingOrTriaged, inProgress, approvedUndecomposed };
}
function appendBacklogExhaustedSignals(stats, reasons, suggestions) {
    if (stats.pendingOrTriaged === 0 && stats.inProgress === 0 && stats.approvedUndecomposed === 0) {
        reasons.push("backlog empty + no undecomposed specs → no actionable work");
        suggestions.push("Author a new SPEC or FEAT to continue. Run `/loop:spec add` or `/loop:backlog add`.");
    }
}
// Folds warn-severity pattern-alerts into blockers + a single reason line.
// When autoMode===true and alert.category appears in ignoredCategories, the
// alert is pushed to suggestions instead of blockers and does NOT halt the loop.
// options.demotedCount.value is incremented for each demoted alert.
export function applyWarnAlertSignals(warnAlerts, blockers, reasons, options = {}) {
    if (warnAlerts.length === 0)
        return;
    const { autoMode = false, ignoredCategories = [], suggestions, demotedCount } = options;
    const haltAlerts = [];
    for (const a of warnAlerts) {
        if (autoMode && ignoredCategories.includes(a.category)) {
            suggestions?.push(a.suggested_action || a.message);
            if (demotedCount)
                demotedCount.value += 1;
        }
        else {
            haltAlerts.push(a);
        }
    }
    if (haltAlerts.length === 0)
        return;
    for (const a of haltAlerts) {
        blockers.push({ category: a.category, message: a.message, suggestion: a.suggested_action });
    }
    reasons.push(`${haltAlerts.length} warn-severity alert(s) — resolve before rolling next slice`);
}
function applyIterationCapSignals(iterStatus, reasons, suggestions, { autoMode }) {
    if (!iterStatus.exhausted || autoMode)
        return;
    reasons.push(`iteration cap reached (${iterStatus.count}/${iterStatus.cap})`);
    suggestions.push(`The autonomous loop has completed ${iterStatus.count} iterations without finishing. ` +
        `This is a safety limit to prevent unbounded token burn. ` +
        `Increase loop.maxIterations in .claude/loop.json if you need more cycles.`);
}
function applyCostAlertSignal(costAlertCount, config, reasons, suggestions) {
    if (costAlertCount < (config?.loop?.costStopThreshold || 1))
        return;
    reasons.push(`cost_alert_high: ${costAlertCount} high-severity cost recommendation(s) across last 3 slices`);
    suggestions.push("The cost trajectory has triggered a high-severity alert. Review the cost-advisor output and optimize before continuing. " +
        "Adjust loop.costStopThreshold in .claude/loop.json to change this behavior.");
}
function buildCeilingSnapshotEntry(sig) {
    if (!sig)
        return null;
    return { exceeded: true, actualUsd: sig.actualUsd, ceilingUsd: sig.ceilingUsd };
}
function buildRegressionSnapshotEntry(sig) {
    if (!sig)
        return null;
    return {
        triggered: true,
        currentUsd: sig.currentUsd,
        medianUsd: sig.medianUsd,
        thresholdUsd: sig.thresholdUsd,
        multiplier: sig.multiplier,
        window: sig.window,
        sampleCount: sig.sampleCount
    };
}
function buildSessionDriftSnapshotEntry(sig) {
    if (!sig)
        return null;
    return {
        triggered: true,
        sessionIdAtStart: sig.sessionIdAtStart,
        sessionIdNow: sig.sessionIdNow
    };
}
/** Build the snapshot entry for the merge_failed halt-badge (FEAT-062 / SLICE-64). */
export function buildMergeFailedSnapshotEntry(workflowState) {
    const badge = workflowState?.currentRun?.gates?.mergeFailed;
    if (!badge || badge.status !== "failed")
        return null;
    return badge;
}
function applySessionDriftSignal(driftSignal, reasons, suggestions, blockers) {
    if (!driftSignal)
        return;
    const { sessionIdAtStart, sessionIdNow } = driftSignal;
    reasons.push(`session_drift_stop: current session ${sessionIdNow} differs from slice-start session ${sessionIdAtStart}`);
    blockers.push({
        category: "session-drift",
        message: `walker resumed in a different Claude session (was: ${sessionIdAtStart}, now: ${sessionIdNow})`,
        suggestion: "Complete the slice in the original session, or re-run with --allow-cross-session to bypass the halt and log the override."
    });
    suggestions.push(`The walker pinned session ${sessionIdAtStart} at slice-start but resumed in session ${sessionIdNow}. ` +
        "Complete the slice in the original session, or pass --allow-cross-session on the auto CLI to override.");
}
function applyCostRegressionSignal(regressionSignal, reasons, suggestions, blockers) {
    if (!regressionSignal)
        return;
    const current = regressionSignal.currentUsd.toFixed(2);
    const median = regressionSignal.medianUsd.toFixed(2);
    const threshold = regressionSignal.thresholdUsd.toFixed(2);
    const { multiplier, window: w, sampleCount } = regressionSignal;
    reasons.push(`cost_regression_stop: current $${current} > median $${median} × ${multiplier}` +
        ` (threshold $${threshold}, window ${w}, sample ${sampleCount})`);
    blockers.push({
        category: "cost-regression",
        message: `aggregate spend $${current} exceeded rolling-median threshold $${threshold}` +
            ` (median $${median} × ${multiplier}, sample ${sampleCount})`,
        suggestion: "Review the latest aggregate cost report and address inefficiencies before resuming. " +
            "Adjust loop.costRegressionMultiplier or loop.costRegressionWindow in .claude/loop.json to change this behavior."
    });
    suggestions.push(`Current aggregate spend $${current} is more than ${multiplier}× the rolling median $${median}` +
        ` (threshold $${threshold}). Inspect .claude/artifacts/crew/cost/ for opus-overuse / cache-busted findings. ` +
        "Adjust loop.costRegressionMultiplier or loop.costRegressionWindow in .claude/loop.json to change this behavior.");
}
function applySliceCostCeilingSignal(ceilingSignal, reasons, suggestions, blockers) {
    if (!ceilingSignal)
        return;
    const actual = ceilingSignal.actualUsd.toFixed(2);
    const ceiling = ceilingSignal.ceilingUsd;
    reasons.push(`[HIGH] slice-cost-ceiling:exceeded (actual: $${actual}, ceiling: $${ceiling})`);
    blockers.push({
        category: "slice-cost-ceiling",
        message: `latest slice spend $${actual} exceeded ceiling $${ceiling}`,
        suggestion: "Review the latest cost report under .claude/artifacts/crew/cost/, address opus-overuse / cache-busted findings, then adjust loop.costSliceCeiling in .claude/loop.json if the new floor is intentional."
    });
    suggestions.push(`Latest slice cost $${actual} exceeded loop.costSliceCeiling ($${ceiling}). ` +
        "Inspect the cost report (referenced under .claude/artifacts/crew/cost/) for opus-overuse / cache-busted findings before rolling the next slice. " +
        "Adjust loop.costSliceCeiling in .claude/loop.json to change this behavior.");
}
function applyGradeTrendSignal(gradeTrendSignal, reasons, suggestions) {
    if (!gradeTrendSignal)
        return;
    reasons.push(gradeTrendSignal.reason);
    suggestions.push(`Grade trend below threshold (${gradeTrendSignal.threshold}) for ${gradeTrendSignal.consecutiveBelow} consecutive slice(s). ` +
        "Review recent slice grades before resuming the autonomous loop. " +
        "Adjust loop.gradeTrendThreshold or loop.gradeTrendConsecutiveLimit in .claude/loop.json to change this behavior.");
}
function appendCrewGateSignals(crewGates, reasons, suggestions, { autoMode }) {
    if (crewGates.escalated) {
        reasons.push(`crew run escalated_to_human: ${crewGates.escalated.note || "(no note)"} — hard stop`);
        suggestions.push("The crew workflow has been escalated to a human. Resolve the escalation and clear the badge before resuming the loop.");
    }
    else if (crewGates.blocked && !autoMode) {
        reasons.push(`crew run blocked: ${crewGates.blocked.note || "(no note)"}` +
            (crewGates.blocked.blockedBy ? ` (blockedBy ${crewGates.blocked.blockedBy})` : ""));
        suggestions.push("The crew workflow is blocked. Unblock the run (clear the badge or write the missing artifact) before continuing.");
    }
}
async function gatherStopInputs(repoPath, config) {
    const [backlog, specs, alerts, costAlertCount, crewGates, gradeTrendSignal, costCeilingSignal, costRegressionSignal, sessionDriftSignal, workflowState] = await Promise.all([
        listBacklog(repoPath, { config }),
        listSpecs(repoPath, { config }),
        detectPatterns(repoPath, { config }),
        countHighSeverityCostAlerts(repoPath, 3),
        readCrewBlockingGates(repoPath),
        checkGradeTrend(repoPath, config),
        checkSliceCostCeiling(repoPath, config),
        checkCostRegression(repoPath, config),
        checkSessionDrift(repoPath),
        readCrewWorkflowState(repoPath)
    ]);
    return {
        backlog,
        specs,
        alerts,
        costAlertCount,
        crewGates,
        gradeTrendSignal,
        costCeilingSignal,
        costRegressionSignal,
        sessionDriftSignal,
        workflowState
    };
}
// eslint-disable-next-line complexity -- pipeline orchestrator; complexity inflated by config nullish-chaining and apply* calls, but actual branching is linear. Track as follow-up to consolidate apply* calls into a single resolver.
export async function checkStopConditions(repoPath, { config = null, ignoreAlerts = false } = {}) {
    const { backlog, specs, alerts, costAlertCount, crewGates, gradeTrendSignal, costCeilingSignal, costRegressionSignal, sessionDriftSignal, workflowState } = await gatherStopInputs(repoPath, config);
    // autoMode defaults to true so freshly hand-rolled .claude/loop.json
    // (without the key) get the new behavior. Presets ship the key explicitly
    // for documentation, but the default here is the source of truth.
    // config.loop.marathonMode is a deprecated alias; autoMode wins if both set.
    const autoMode = config?.loop?.autoMode ?? config?.loop?.marathonMode ?? true;
    const reasons = [];
    const blockers = [];
    const suggestions = [];
    let iterationCapReached = false;
    appendCrewGateSignals(crewGates, reasons, suggestions, { autoMode });
    const backlogStats = computeBacklogStats(backlog, specs);
    appendBacklogExhaustedSignals(backlogStats, reasons, suggestions);
    const warnAlerts = ignoreAlerts ? [] : alerts.filter((a) => a.severity === "warn");
    const ignoredCategories = config?.loop?.warnAlertCategoriesIgnoredInAutoMode ?? [
        "score-trend"
    ];
    const warnDemotedCount = { value: 0 };
    applyWarnAlertSignals(warnAlerts, blockers, reasons, {
        autoMode,
        ignoredCategories,
        suggestions,
        demotedCount: warnDemotedCount
    });
    const iterStatus = await getIterationStatus(repoPath, config?.loop?.maxIterations || 25);
    iterationCapReached = iterStatus.exhausted;
    applyIterationCapSignals(iterStatus, reasons, suggestions, { autoMode });
    applyCostAlertSignal(costAlertCount, config, reasons, suggestions);
    applySliceCostCeilingSignal(costCeilingSignal, reasons, suggestions, blockers);
    applyCostRegressionSignal(costRegressionSignal, reasons, suggestions, blockers);
    applySessionDriftSignal(sessionDriftSignal, reasons, suggestions, blockers);
    applyGradeTrendSignal(gradeTrendSignal, reasons, suggestions);
    return assembleStopResult({
        reasons,
        blockers,
        suggestions,
        iterationCapReached,
        backlogStats,
        alerts,
        warnAlerts,
        warnDemotedCount: warnDemotedCount.value,
        iterStatus,
        costAlertCount,
        crewGates,
        autoMode,
        gradeTrendSignal,
        costCeilingSignal,
        costRegressionSignal,
        sessionDriftSignal,
        workflowState
    });
}
// Assemble the stop-check return shape. Extracted so checkStopConditions stays
// under the cyclomatic-complexity cap after FEAT-059 added autoMode + warn-alert
// demotion branches.
function assembleStopResult(p) {
    return {
        shouldStop: p.reasons.length > 0,
        reasons: p.reasons,
        blockers: p.blockers,
        suggestions: p.suggestions,
        iterationCapReached: p.iterationCapReached,
        snapshot: {
            pendingOrTriaged: p.backlogStats.pendingOrTriaged,
            inProgress: p.backlogStats.inProgress,
            approvedUndecomposed: p.backlogStats.approvedUndecomposed,
            totalAlerts: p.alerts.length,
            warnAlerts: p.warnAlerts.length,
            warnAlertsDemoted: p.warnDemotedCount,
            iterationCount: p.iterStatus.count,
            iterationCap: p.iterStatus.cap,
            costAlerts: p.costAlertCount,
            crewBlocked: Boolean(p.crewGates.blocked),
            crewEscalated: Boolean(p.crewGates.escalated),
            autoMode: p.autoMode,
            marathonMode: p.autoMode,
            gradeTrend: p.gradeTrendSignal
                ? {
                    consecutiveBelow: p.gradeTrendSignal.consecutiveBelow,
                    threshold: p.gradeTrendSignal.threshold
                }
                : null,
            sliceCostCeiling: buildCeilingSnapshotEntry(p.costCeilingSignal),
            costRegression: buildRegressionSnapshotEntry(p.costRegressionSignal),
            sessionDrift: buildSessionDriftSnapshotEntry(p.sessionDriftSignal),
            mergeFailed: buildMergeFailedSnapshotEntry(p.workflowState)
        }
    };
}
