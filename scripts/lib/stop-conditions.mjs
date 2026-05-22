import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { detectPatterns } from "./pattern-alerts.mjs";
import { getIterationStatus } from "./loop-iteration.mjs";
import { countHighSeverityCostAlerts } from "./cost-alert-loader.mjs";

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
//   C. Iteration cap reached
//      (Runaway halting — loop has completed maxIterations without finishing)
//   D. High-severity cost-advisor alerts fired (cost-alert-high)
//      (Cost is spiraling — halt gracefully and let user review trajectory)
//
// Caller decides what to do with a stop signal:
//   - In autonomous mode: log + halt + ping user
//   - In hand-driven mode: surface in brief
//   - In phase-gate: include in retrospective + handoff

function computeBacklogStats(backlog, specs) {
  const pendingOrTriaged =
    filterBacklog(backlog, { status: "pending" }).length +
    filterBacklog(backlog, { status: "triaged" }).length;
  const inProgress = filterBacklog(backlog, { status: "in-progress" }).length;
  const approvedUndecomposed = specs.filter(
    (s) =>
      s.frontmatter.status === "approved" &&
      (!Array.isArray(s.frontmatter.derived_features) ||
        s.frontmatter.derived_features.length === 0)
  ).length;
  return { pendingOrTriaged, inProgress, approvedUndecomposed };
}

function appendBacklogExhaustedSignals(stats, reasons, suggestions) {
  if (stats.pendingOrTriaged === 0 && stats.inProgress === 0 && stats.approvedUndecomposed === 0) {
    reasons.push("backlog empty + no undecomposed specs → no actionable work");
    suggestions.push(
      "Author a new SPEC or FEAT to continue. Run `/autonomous-loop:spec add` or `/autonomous-loop:backlog add`."
    );
  }
}

// Folds warn-severity pattern-alerts into blockers + a single reason line.
function applyWarnAlertSignals(warnAlerts, blockers, reasons) {
  if (warnAlerts.length === 0) return;
  for (const a of warnAlerts) {
    blockers.push({ category: a.category, message: a.message, suggestion: a.suggested_action });
  }
  reasons.push(`${warnAlerts.length} warn-severity alert(s) — resolve before rolling next slice`);
}

function appendIterationCapSignals(iterStatus, reasons, suggestions) {
  reasons.push(`iteration cap reached (${iterStatus.count}/${iterStatus.cap})`);
  suggestions.push(
    `The autonomous loop has completed ${iterStatus.count} iterations without finishing. ` +
      `This is a safety limit to prevent unbounded token burn. ` +
      `Increase loop.maxIterations in .claude/autonomous-loop.json if you need more cycles.`
  );
}

function appendCostAlertSignals(costAlertCount, reasons, suggestions) {
  reasons.push(
    `cost_alert_high: ${costAlertCount} high-severity cost recommendation(s) across last 3 slices`
  );
  suggestions.push(
    "The cost trajectory has triggered a high-severity alert. Review the cost-advisor output and optimize before continuing. " +
      "Adjust loop.costStopThreshold in .claude/autonomous-loop.json to change this behavior."
  );
}

export async function checkStopConditions(repoPath, { config = null, ignoreAlerts = false } = {}) {
  const [backlog, specs, alerts, costAlertCount] = await Promise.all([
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config }),
    detectPatterns(repoPath, { config }),
    countHighSeverityCostAlerts(repoPath, 3)
  ]);

  const reasons = [];
  const blockers = [];
  const suggestions = [];
  let iterationCapReached = false;

  const backlogStats = computeBacklogStats(backlog, specs);
  appendBacklogExhaustedSignals(backlogStats, reasons, suggestions);

  const warnAlerts = ignoreAlerts ? [] : alerts.filter((a) => a.severity === "warn");
  applyWarnAlertSignals(warnAlerts, blockers, reasons);

  const iterStatus = await getIterationStatus(repoPath, config?.loop?.maxIterations || 25);
  if (iterStatus.exhausted) {
    iterationCapReached = true;
    appendIterationCapSignals(iterStatus, reasons, suggestions);
  }

  if (costAlertCount >= (config?.loop?.costStopThreshold || 1)) {
    appendCostAlertSignals(costAlertCount, reasons, suggestions);
  }

  const shouldStop = reasons.length > 0;
  return {
    shouldStop,
    reasons,
    blockers,
    suggestions,
    iterationCapReached,
    snapshot: {
      pendingOrTriaged: backlogStats.pendingOrTriaged,
      inProgress: backlogStats.inProgress,
      approvedUndecomposed: backlogStats.approvedUndecomposed,
      totalAlerts: alerts.length,
      warnAlerts: warnAlerts.length,
      iterationCount: iterStatus.count,
      iterationCap: iterStatus.cap,
      costAlerts: costAlertCount
    }
  };
}
