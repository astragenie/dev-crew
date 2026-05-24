import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { detectPatterns } from "./pattern-alerts.mjs";
import { getIterationStatus } from "./loop-iteration.mjs";
import { countHighSeverityCostAlerts } from "./cost-alert-loader.mjs";
import { readCrewBlockingGates } from "./crew-workflow-reader.mjs";
import { checkGradeTrend } from "./grade-trend.mjs";

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
//   C. Iteration cap reached (legacy mode only — disabled when marathonMode)
//      (Runaway halting — loop has completed maxIterations without finishing)
//   D. High-severity cost-advisor alerts fired (cost-alert-high)
//      (Cost is spiraling — halt gracefully and let user review trajectory)
//   E. Crew run blocked or escalated. Escalation always halts; the soft
//      blocked-badge branch is disabled when marathonMode (it usually clears
//      on the next iteration).
//
// Marathon mode (config.loop.marathonMode, default true): loop walks the
// entire backlog. Iteration cap and crew blocked-badge become advisory only
// — counter still increments and snapshot still reports them. Set
// marathonMode=false to restore the original five-condition gating.
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
      "Author a new SPEC or FEAT to continue. Run `/loop:spec add` or `/loop:backlog add`."
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

function applyIterationCapSignals(iterStatus, reasons, suggestions, { marathonMode }) {
  if (!iterStatus.exhausted || marathonMode) return;
  reasons.push(`iteration cap reached (${iterStatus.count}/${iterStatus.cap})`);
  suggestions.push(
    `The autonomous loop has completed ${iterStatus.count} iterations without finishing. ` +
      `This is a safety limit to prevent unbounded token burn. ` +
      `Increase loop.maxIterations in .claude/loop.json if you need more cycles.`
  );
}

function applyCostAlertSignal(costAlertCount, config, reasons, suggestions) {
  if (costAlertCount < (config?.loop?.costStopThreshold || 1)) return;
  reasons.push(
    `cost_alert_high: ${costAlertCount} high-severity cost recommendation(s) across last 3 slices`
  );
  suggestions.push(
    "The cost trajectory has triggered a high-severity alert. Review the cost-advisor output and optimize before continuing. " +
      "Adjust loop.costStopThreshold in .claude/loop.json to change this behavior."
  );
}

function applyGradeTrendSignal(gradeTrendSignal, reasons, suggestions) {
  if (!gradeTrendSignal) return;
  reasons.push(gradeTrendSignal.reason);
  suggestions.push(
    `Grade trend below threshold (${gradeTrendSignal.threshold}) for ${gradeTrendSignal.consecutiveBelow} consecutive slice(s). ` +
      "Review recent slice grades before resuming the autonomous loop. " +
      "Adjust loop.gradeTrendThreshold or loop.gradeTrendConsecutiveLimit in .claude/loop.json to change this behavior."
  );
}

function appendCrewGateSignals(crewGates, reasons, suggestions, { marathonMode }) {
  if (crewGates.escalated) {
    reasons.push(
      `crew run escalated_to_human: ${crewGates.escalated.note || "(no note)"} — hard stop`
    );
    suggestions.push(
      "The crew workflow has been escalated to a human. Resolve the escalation and clear the badge before resuming the loop."
    );
  } else if (crewGates.blocked && !marathonMode) {
    reasons.push(
      `crew run blocked: ${crewGates.blocked.note || "(no note)"}` +
        (crewGates.blocked.blockedBy ? ` (blockedBy ${crewGates.blocked.blockedBy})` : "")
    );
    suggestions.push(
      "The crew workflow is blocked. Unblock the run (clear the badge or write the missing artifact) before continuing."
    );
  }
}

export async function checkStopConditions(repoPath, { config = null, ignoreAlerts = false } = {}) {
  const [backlog, specs, alerts, costAlertCount, crewGates, gradeTrendSignal] = await Promise.all([
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config }),
    detectPatterns(repoPath, { config }),
    countHighSeverityCostAlerts(repoPath, 3),
    readCrewBlockingGates(repoPath),
    checkGradeTrend(repoPath, config)
  ]);

  // marathonMode defaults to true so freshly hand-rolled .claude/loop.json
  // (without the key) get the new behavior. Presets ship the key explicitly
  // for documentation, but the default here is the source of truth.
  const marathonMode = config?.loop?.marathonMode !== false;

  const reasons = [];
  const blockers = [];
  const suggestions = [];
  let iterationCapReached = false;
  appendCrewGateSignals(crewGates, reasons, suggestions, { marathonMode });

  const backlogStats = computeBacklogStats(backlog, specs);
  appendBacklogExhaustedSignals(backlogStats, reasons, suggestions);

  const warnAlerts = ignoreAlerts ? [] : alerts.filter((a) => a.severity === "warn");
  applyWarnAlertSignals(warnAlerts, blockers, reasons);

  const iterStatus = await getIterationStatus(repoPath, config?.loop?.maxIterations || 25);
  iterationCapReached = iterStatus.exhausted;
  applyIterationCapSignals(iterStatus, reasons, suggestions, { marathonMode });
  applyCostAlertSignal(costAlertCount, config, reasons, suggestions);
  applyGradeTrendSignal(gradeTrendSignal, reasons, suggestions);

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
      costAlerts: costAlertCount,
      crewBlocked: Boolean(crewGates.blocked),
      crewEscalated: Boolean(crewGates.escalated),
      marathonMode,
      gradeTrend: gradeTrendSignal
        ? {
            consecutiveBelow: gradeTrendSignal.consecutiveBelow,
            threshold: gradeTrendSignal.threshold
          }
        : null
    }
  };
}
