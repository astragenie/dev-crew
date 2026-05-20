import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { detectPatterns } from "./pattern-alerts.mjs";

// Unified stop-condition resolver. Returns a structured verdict:
//   { shouldStop, reasons, blockers, suggestions }
// Used by Cross-Slice Continuation HARD RULE (and crew brief) to decide
// whether to roll the next slice or stop the autonomous loop.
//
// Stop conditions (any one triggers shouldStop=true):
//   A. Backlog empty AND no approved-undecomposed specs
//      (Every spec satisfied or in flight → genuine no-work state)
//   B. Severity-warn pattern alerts present (e.g. score-trend regression,
//      in-progress orphan, decomposition explosion)
//      (Bad signal — address before continuing rather than charging ahead)
//
// Caller decides what to do with a stop signal:
//   - In autonomous mode: log + halt + ping user
//   - In hand-driven mode: surface in brief
//   - In phase-gate: include in retrospective + handoff

export async function checkStopConditions(repoPath, { config = null, ignoreAlerts = false } = {}) {
  const [backlog, specs, alerts] = await Promise.all([
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config }),
    detectPatterns(repoPath, { config })
  ]);

  const reasons = [];
  const blockers = [];
  const suggestions = [];

  // A: backlog + specs exhausted
  const pendingOrTriaged = filterBacklog(backlog, { status: "pending" }).length
    + filterBacklog(backlog, { status: "triaged" }).length;
  const inProgress = filterBacklog(backlog, { status: "in-progress" }).length;
  const approvedUndecomposed = specs.filter((s) =>
    s.frontmatter.status === "approved" &&
    (!Array.isArray(s.frontmatter.derived_features) || s.frontmatter.derived_features.length === 0)
  ).length;

  if (pendingOrTriaged === 0 && inProgress === 0 && approvedUndecomposed === 0) {
    reasons.push("backlog empty + no undecomposed specs → no actionable work");
    suggestions.push("Author a new SPEC or FEAT to continue. Run `/autonomous-loop:spec add` or `/autonomous-loop:backlog add`.");
  }

  // B: warn-severity alerts
  const warnAlerts = ignoreAlerts ? [] : alerts.filter((a) => a.severity === "warn");
  if (warnAlerts.length > 0) {
    for (const a of warnAlerts) {
      blockers.push({
        category: a.category,
        message: a.message,
        suggestion: a.suggested_action
      });
    }
    reasons.push(`${warnAlerts.length} warn-severity alert(s) — resolve before rolling next slice`);
  }

  const shouldStop = reasons.length > 0;
  return {
    shouldStop,
    reasons,
    blockers,
    suggestions,
    snapshot: {
      pendingOrTriaged,
      inProgress,
      approvedUndecomposed,
      totalAlerts: alerts.length,
      warnAlerts: warnAlerts.length
    }
  };
}
