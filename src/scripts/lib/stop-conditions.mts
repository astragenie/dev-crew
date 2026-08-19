import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { detectPatterns } from "./pattern-alerts.mjs";
import { getIterationStatus } from "./loop-iteration.mjs";
import { countHighSeverityCostAlerts } from "./cost-alert-loader.mjs";
import { readCrewBlockingGates, readCrewWorkflowState } from "./crew-workflow-reader.mjs";
import { applyStaleBlockedBadgePolicy } from "./blocked-badge-staleness.mjs";
import { checkGradeTrend } from "./grade-trend.mjs";
import { checkSliceCostCeiling, type SliceCostCeilingSignal } from "./slice-cost-ceiling.mjs";
import { checkCostRegression, type CostRegressionSignal } from "./cost-regression.mjs";
import { checkSessionDrift, type SessionDriftSignal } from "./session-drift.mjs";
import { checkRedundantReadStop, type RedundantReadSignal } from "./redundant-read-detector.mjs";
import { checkMarathonCheckpoint, type MarathonCheckpointSignal } from "./marathon-checkpoint.mjs";
import {
  checkPausedForExternalEvent,
  type PausedForExternalEventSignal
} from "./paused-for-external-event.mjs";
import { checkStuckDetector, type StuckDetectedSignal } from "./stuck-detector.mjs";
import { fanoutEnvelope } from "./webhook-fanout.mjs";
import {
  diffHaltBadgeTransitions,
  resolveResolverAgentRole,
  type ResolvedHaltBadgeEntry
} from "./halt-badge-state.mjs";

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

function computeBacklogStats(backlog: any[], specs: any[]) {
  const pendingOrTriaged =
    filterBacklog(backlog, { status: "pending" }).length +
    filterBacklog(backlog, { status: "triaged" }).length;
  const inProgress = filterBacklog(backlog, { status: "in-progress" }).length;
  const approvedUndecomposed = specs.filter(
    (s: Record<string, any>) =>
      s.frontmatter.status === "approved" &&
      (!Array.isArray(s.frontmatter.derived_features) ||
        s.frontmatter.derived_features.length === 0)
  ).length;
  return { pendingOrTriaged, inProgress, approvedUndecomposed };
}

function appendBacklogExhaustedSignals(
  stats: Record<string, number>,
  reasons: string[],
  suggestions: string[]
) {
  if (stats.pendingOrTriaged === 0 && stats.inProgress === 0 && stats.approvedUndecomposed === 0) {
    reasons.push("backlog empty + no undecomposed specs → no actionable work");
    suggestions.push(
      "Author a new SPEC or FEAT to continue. Run `/devcrew:spec add` or `/devcrew:backlog add`."
    );
  }
}

// Folds warn-severity pattern-alerts into blockers + a single reason line.
// When autoMode===true and alert.category appears in ignoredCategories, the
// alert is pushed to suggestions instead of blockers and does NOT halt the loop.
// options.demotedCount.value is incremented for each demoted alert.
export function applyWarnAlertSignals(
  warnAlerts: any[],
  blockers: any[],
  reasons: any[],
  options: {
    autoMode?: boolean;
    ignoredCategories?: string[];
    suggestions?: any[];
    demotedCount?: { value: number };
  } = {}
) {
  if (warnAlerts.length === 0) return;
  const { autoMode = false, ignoredCategories = [], suggestions, demotedCount } = options;
  const haltAlerts: any[] = [];
  for (const a of warnAlerts) {
    if (autoMode && ignoredCategories.includes(a.category)) {
      suggestions?.push(a.suggested_action || a.message);
      if (demotedCount) demotedCount.value += 1;
    } else {
      haltAlerts.push(a);
    }
  }
  if (haltAlerts.length === 0) return;
  for (const a of haltAlerts) {
    blockers.push({ category: a.category, message: a.message, suggestion: a.suggested_action });
  }
  reasons.push(`${haltAlerts.length} warn-severity alert(s) — resolve before rolling next slice`);
}

function applyIterationCapSignals(
  iterStatus: Record<string, any>,
  reasons: string[],
  suggestions: string[],
  { autoMode }: { autoMode: boolean }
) {
  if (!iterStatus.exhausted || autoMode) return;
  reasons.push(`iteration cap reached (${iterStatus.count}/${iterStatus.cap})`);
  suggestions.push(
    `The autonomous loop has completed ${iterStatus.count} iterations without finishing. ` +
      `This is a safety limit to prevent unbounded token burn. ` +
      `Increase loop.maxIterations in .claude/loop.json if you need more cycles.`
  );
}

function applyCostAlertSignal(
  costAlertCount: number,
  _config: Record<string, any> | null,
  _reasons: string[],
  suggestions: string[]
) {
  // Demoted to advisory (no halt). High-severity cost alerts emit a suggestion
  // but the loop continues. Use slice-cost-ceiling for a hard per-slice halt.
  if (costAlertCount < 1) return;
  suggestions.push(
    `cost_alert_high: ${costAlertCount} high-severity cost recommendation(s) across last 3 slices. ` +
      "Review the cost-advisor output and optimize before continuing."
  );
}

function buildCeilingSnapshotEntry(sig: SliceCostCeilingSignal | null) {
  if (!sig) return null;
  return { exceeded: true, actualUsd: sig.actualUsd, ceilingUsd: sig.ceilingUsd };
}

function buildRegressionSnapshotEntry(sig: CostRegressionSignal | null) {
  if (!sig) return null;
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

function buildSessionDriftSnapshotEntry(sig: SessionDriftSignal | null) {
  if (!sig) return null;
  return {
    triggered: true,
    sessionIdAtStart: sig.sessionIdAtStart,
    sessionIdNow: sig.sessionIdNow
  };
}

/** Build the snapshot entry for the merge_failed halt-badge (FEAT-062 / SLICE-64). */
export function buildMergeFailedSnapshotEntry(workflowState: any): any | null {
  const badge = workflowState?.currentRun?.gates?.mergeFailed;
  if (badge?.status !== "failed") return null;
  return badge;
}

function buildRedundantReadSnapshotEntry(sig: RedundantReadSignal | null) {
  if (!sig) return null;
  return {
    triggered: true,
    maxReadCount: sig.maxReadCount,
    path: sig.path,
    sessionId: sig.sessionId,
    threshold: sig.threshold,
    offendingPathCount: sig.offendingPathCount
  };
}

function applySessionDriftSignal(
  driftSignal: SessionDriftSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!driftSignal) return;
  const { sessionIdAtStart, sessionIdNow } = driftSignal;
  reasons.push(
    `session_drift_stop: current session ${sessionIdNow} differs from slice-start session ${sessionIdAtStart}`
  );
  blockers.push({
    category: "session-drift",
    message: `walker resumed in a different Claude session (was: ${sessionIdAtStart}, now: ${sessionIdNow})`,
    suggestion:
      "Complete the slice in the original session, or re-run with --allow-cross-session to bypass the halt and log the override."
  });
  suggestions.push(
    `The walker pinned session ${sessionIdAtStart} at slice-start but resumed in session ${sessionIdNow}. ` +
      "Complete the slice in the original session, or pass --allow-cross-session on the auto CLI to override."
  );
}

function buildMarathonCheckpointSnapshotEntry(sig: MarathonCheckpointSignal | null) {
  if (!sig) return null;
  return {
    level: sig.level,
    closesSinceCheckpoint: sig.closesSinceCheckpoint,
    every: sig.every,
    hardThreshold: sig.hardThreshold,
    lastRetroPath: sig.lastRetroPath
  };
}

export function buildPausedForExternalEventSnapshotEntry(
  sig: PausedForExternalEventSignal | null
): PausedForExternalEventSignal | null {
  if (!sig) return null;
  return sig;
}

function applyPausedForExternalEventSignal(
  sig: PausedForExternalEventSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!sig) return;
  reasons.push(`paused_for_external_event: ${sig.reason} (paused at ${sig.pausedAt})`);
  blockers.push({
    category: "paused-for-external-event",
    message: `loop paused by operator: ${sig.reason} (since ${sig.pausedAt})`,
    suggestion: "Run: bun src/scripts/loop.mts resume --repo ."
  });
  suggestions.push(sig.resumeHint);
}

function buildStuckDetectedSnapshotEntry(
  sig: StuckDetectedSignal | null
): StuckDetectedSignal | null {
  if (!sig) return null;
  return sig;
}

function applyStuckDetectedSignal(
  sig: StuckDetectedSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!sig) return;
  reasons.push(
    `stuck_detected: ${sig.sliceId} builder attempted ${sig.attempts} times without PASS (threshold ${sig.threshold})`
  );
  blockers.push({
    category: "stuck-detected",
    message: `Builder retried ${sig.attempts} times without PASS for slice ${sig.sliceId}`,
    suggestion: "Run: bun src/scripts/loop.mts stuck-reset"
  });
  suggestions.push(
    `Builder has retried ${sig.attempts} times without PASS for slice ${sig.sliceId} (threshold ${sig.threshold}). ` +
      "Investigate root cause before re-dispatching. Run: bun src/scripts/loop.mts stuck-reset --repo . to clear the counter."
  );
}

function applyMarathonCheckpointSignal(
  sig: MarathonCheckpointSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!sig) return;
  const due = `${sig.closesSinceCheckpoint} slice(s) closed since the last retrospective`;
  const cmd = "Run `/devcrew:retrospective` to capture lessons before continuing.";
  if (sig.level === "warn") {
    suggestions.push(
      `marathon_checkpoint_due: ${due} (advisory at >=${sig.every}, hard stop at >=${sig.hardThreshold}). ${cmd}`
    );
    return;
  }
  reasons.push(
    `marathon_checkpoint_required: ${due} (hard threshold ${sig.hardThreshold}) — checkpoint mandatory before next slice`
  );
  blockers.push({
    category: "marathon-checkpoint",
    message: `${due}; hard threshold ${sig.hardThreshold} reached. Drift accumulates beyond this point.`,
    suggestion: cmd
  });
  suggestions.push(cmd);
}

function applyRedundantReadStopSignal(
  sig: RedundantReadSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!sig) return;
  const { maxReadCount, path: filePath, threshold, sessionId, offendingPathCount } = sig;
  reasons.push(
    `redundant_read_stop: path \`${filePath}\` re-read ${maxReadCount} times (cap ${threshold}, ${offendingPathCount} offending path${offendingPathCount === 1 ? "" : "s"} in session ${sessionId})`
  );
  blockers.push({
    category: "redundant-read-stop",
    message: `file \`${filePath}\` was Read ${maxReadCount} times in session ${sessionId} (cap ${threshold}). Cumulative redundant reads waste tokens and bust the prompt cache.`,
    suggestion:
      "Trust prior Read results; avoid re-reading unchanged paths. Tune the cap via loop.redundantReadCap in .claude/loop.json if the threshold is too aggressive."
  });
  suggestions.push(
    `Redundant Read detected: \`${filePath}\` read ${maxReadCount} times (cap ${threshold}). ` +
      "Use prior content; raise loop.redundantReadCap in .claude/loop.json to relax the gate."
  );
}

function applyCostRegressionSignal(
  regressionSignal: CostRegressionSignal | null,
  _reasons: any[],
  suggestions: any[],
  _blockers: any[]
) {
  // Demoted to advisory (no halt). cost-regression continues to be evaluated
  // and reported (cost-reports + brief), but the loop no longer stops on it.
  // Use slice-cost-ceiling for a hard per-slice halt.
  if (!regressionSignal) return;
  const current = regressionSignal.currentUsd.toFixed(2);
  const median = regressionSignal.medianUsd.toFixed(2);
  const threshold = regressionSignal.thresholdUsd.toFixed(2);
  const { multiplier } = regressionSignal;
  suggestions.push(
    `cost-regression advisory: current $${current} is more than ${multiplier}× the rolling median $${median}` +
      ` (threshold $${threshold}). Inspect .claude/artifacts/crew/cost/ for opus-overuse / cache-busted findings. ` +
      "Tune via loop.cost.regression.{multiplier,window} in .claude/loop.json."
  );
}

function applySliceCostCeilingSignal(
  ceilingSignal: SliceCostCeilingSignal | null,
  reasons: string[],
  suggestions: string[],
  blockers: Array<Record<string, string>>
) {
  if (!ceilingSignal) return;
  const actual = ceilingSignal.actualUsd.toFixed(2);
  const ceiling = ceilingSignal.ceilingUsd;
  reasons.push(`[HIGH] slice-cost-ceiling:exceeded (actual: $${actual}, ceiling: $${ceiling})`);
  blockers.push({
    category: "slice-cost-ceiling",
    message: `latest slice spend $${actual} exceeded ceiling $${ceiling}`,
    suggestion:
      "Review the latest cost report under .claude/artifacts/crew/cost/, address opus-overuse / cache-busted findings, then adjust loop.costSliceCeiling in .claude/loop.json if the new floor is intentional."
  });
  suggestions.push(
    `Latest slice cost $${actual} exceeded loop.costSliceCeiling ($${ceiling}). ` +
      "Inspect the cost report (referenced under .claude/artifacts/crew/cost/) for opus-overuse / cache-busted findings before rolling the next slice. " +
      "Adjust loop.costSliceCeiling in .claude/loop.json to change this behavior."
  );
}

function applyGradeTrendSignal(
  gradeTrendSignal: Record<string, any> | null,
  reasons: string[],
  suggestions: string[]
) {
  if (!gradeTrendSignal) return;
  reasons.push(gradeTrendSignal.reason);
  suggestions.push(
    `Grade trend below threshold (${gradeTrendSignal.threshold}) for ${gradeTrendSignal.consecutiveBelow} consecutive slice(s). ` +
      "Review recent slice grades before resuming the autonomous loop. " +
      "Adjust loop.gradeTrendThreshold or loop.gradeTrendConsecutiveLimit in .claude/loop.json to change this behavior."
  );
}

function appendCrewGateSignals(
  crewGates: Record<string, any>,
  reasons: string[],
  suggestions: string[],
  { autoMode }: { autoMode: boolean }
) {
  if (crewGates.escalated) {
    reasons.push(
      `crew run escalated_to_human: ${crewGates.escalated.note || "(no note)"} — hard stop`
    );
    suggestions.push(
      "The crew workflow has been escalated to a human. Resolve the escalation and clear the badge before resuming the loop."
    );
  } else if (crewGates.blocked && !autoMode) {
    reasons.push(
      `crew run blocked: ${crewGates.blocked.note || "(no note)"}` +
        (crewGates.blocked.blockedBy ? ` (blockedBy ${crewGates.blocked.blockedBy})` : "")
    );
    suggestions.push(
      "The crew workflow is blocked. Unblock the run (clear the badge or write the missing artifact) before continuing."
    );
  }
}

async function gatherStopInputs(repoPath: string, config: Record<string, any> | null) {
  const [
    backlog,
    specs,
    alerts,
    costAlertCount,
    crewGates,
    gradeTrendSignal,
    costCeilingSignal,
    costRegressionSignal,
    sessionDriftSignal,
    redundantReadSignal,
    marathonCheckpointSignal,
    workflowState,
    pausedForExternalEventSignal,
    stuckDetectedSignal
  ] = await Promise.all([
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config }),
    detectPatterns(repoPath, { config }),
    countHighSeverityCostAlerts(repoPath, 3),
    readCrewBlockingGates(repoPath),
    checkGradeTrend(repoPath, config),
    checkSliceCostCeiling(repoPath, config),
    checkCostRegression(repoPath, config),
    checkSessionDrift(repoPath),
    checkRedundantReadStop(repoPath, config),
    checkMarathonCheckpoint(repoPath, config),
    readCrewWorkflowState(repoPath),
    checkPausedForExternalEvent(repoPath),
    checkStuckDetector(repoPath)
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
    redundantReadSignal,
    marathonCheckpointSignal,
    workflowState,
    pausedForExternalEventSignal,
    stuckDetectedSignal
  };
}

// eslint-disable-next-line complexity -- pipeline orchestrator; complexity inflated by config nullish-chaining and apply* calls, but actual branching is linear. Track as follow-up to consolidate apply* calls into a single resolver.
export async function checkStopConditions(
  repoPath: string,
  { config = null, ignoreAlerts = false }: Record<string, any> = {}
) {
  const {
    backlog,
    specs,
    alerts,
    costAlertCount,
    crewGates: rawCrewGates,
    gradeTrendSignal,
    costCeilingSignal,
    costRegressionSignal,
    sessionDriftSignal,
    redundantReadSignal,
    marathonCheckpointSignal,
    workflowState,
    pausedForExternalEventSignal,
    stuckDetectedSignal
  } = await gatherStopInputs(repoPath, config);

  const crewGates = applyStaleBlockedBadgePolicy(rawCrewGates, config, repoPath);

  // autoMode defaults to true so freshly hand-rolled .claude/loop.json
  // (without the key) get the new behavior. Presets ship the key explicitly
  // for documentation, but the default here is the source of truth.
  // config.loop.marathonMode is a deprecated alias; autoMode wins if both set.
  const autoMode = config?.loop?.autoMode ?? config?.loop?.marathonMode ?? true;

  const reasons: any[] = [];
  const blockers: any[] = [];
  const suggestions: any[] = [];
  let iterationCapReached = false;
  appendCrewGateSignals(crewGates, reasons, suggestions, { autoMode });

  const backlogStats = computeBacklogStats(backlog, specs);
  appendBacklogExhaustedSignals(backlogStats, reasons, suggestions);

  const warnAlerts = ignoreAlerts ? [] : alerts.filter((a) => a.severity === "warn");
  const ignoredCategories: string[] = config?.loop?.warnAlertCategoriesIgnoredInAutoMode ?? [
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
  applyRedundantReadStopSignal(redundantReadSignal, reasons, suggestions, blockers);
  applyMarathonCheckpointSignal(marathonCheckpointSignal, reasons, suggestions, blockers);
  applyPausedForExternalEventSignal(pausedForExternalEventSignal, reasons, suggestions, blockers);
  applyStuckDetectedSignal(stuckDetectedSignal, reasons, suggestions, blockers);
  applyGradeTrendSignal(gradeTrendSignal, reasons, suggestions);

  const result = assembleStopResult({
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
    redundantReadSignal,
    marathonCheckpointSignal,
    workflowState,
    pausedForExternalEventSignal,
    stuckDetectedSignal
  });

  // M4 / L4-2: fan out one `halt_badge` envelope per populated halt-badge
  // snapshot field. Fail-silent — JSONL / snapshot remain authoritative.
  await fanoutHaltBadgesFromSnapshot(repoPath, result.snapshot, {});

  return result;
}

// Assemble the stop-check return shape. Extracted so checkStopConditions stays
// under the cyclomatic-complexity cap after FEAT-059 added autoMode + warn-alert
// demotion branches.
function assembleStopResult(p: any) {
  const checkpointDue =
    p.marathonCheckpointSignal !== null && p.marathonCheckpointSignal !== undefined;
  const sliceClosesSinceCheckpoint = p.marathonCheckpointSignal?.closesSinceCheckpoint ?? null;
  return {
    shouldStop: p.reasons.length > 0,
    reasons: p.reasons,
    blockers: p.blockers,
    suggestions: p.suggestions,
    iterationCapReached: p.iterationCapReached,
    checkpointDue,
    sliceClosesSinceCheckpoint,
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
      mergeFailed: buildMergeFailedSnapshotEntry(p.workflowState),
      redundantReadStop: buildRedundantReadSnapshotEntry(p.redundantReadSignal),
      marathonCheckpoint: buildMarathonCheckpointSnapshotEntry(p.marathonCheckpointSignal),
      pausedForExternalEvent: buildPausedForExternalEventSnapshotEntry(
        p.pausedForExternalEventSignal
      ),
      stuckDetected: buildStuckDetectedSnapshotEntry(p.stuckDetectedSignal)
    }
  };
}

/**
 * Closed-set list of halt-badge field names that live under `snapshot.*`.
 * Source of truth is `docs/halt-badges.md`; new entries MUST land here and
 * in the registry simultaneously (see "How to add a new halt-badge" §).
 *
 * Non-halt-badge snapshot fields (numeric / boolean dashboards like
 * `pendingOrTriaged`, `iterationCount`, `autoMode`) are intentionally
 * excluded so they don't pollute the runner's halt-badge stream.
 */
export const HALT_BADGE_FIELDS = [
  "costRegression",
  "sessionDrift",
  "sliceCostCeiling",
  "gradeTrend",
  "mergeFailed",
  "redundantReadStop",
  "marathonCheckpoint",
  "pausedForExternalEvent",
  "stuckDetected"
] as const;

/**
 * Halt-events v1 contract schema version (issue #297). BE tolerates absence
 * (defaults to "1.0.0" on ingest) so this is safe to bump independently of
 * BE deploys as long as the shape stays backward compatible.
 */
export const HALT_BADGE_SCHEMA_VERSION = "1.0.0";

/**
 * Iterate every populated halt-badge field in `snapshot` and fan one envelope
 * per non-null field via `webhook-fanout::fanoutEnvelope` as kind `halt_badge`.
 *
 * Payload shape matches `schemas/loop-events/halt-badge.schema.json`:
 *   { schemaVersion, badgeKind, ts, details, sliceId?, waveId? }
 *
 * Also detects populated -> cleared transitions since the previous call
 * (tracked via `halt-badge-state.mjs`) and fans out one `halt_badge.resolved`
 * envelope per resolved badge — see
 * `schemas/loop-events/halt-badge-resolved.schema.json`.
 *
 * Fail-silent on individual fanout errors — JSONL / snapshot data already
 * landed in the stop-check result and remain authoritative.
 */
export async function fanoutHaltBadgesFromSnapshot(
  repoPath: string,
  snapshot: Record<string, unknown>,
  context: { sliceId?: string; waveId?: string } = {}
): Promise<void> {
  const ts = new Date().toISOString();
  const currentOpen: Record<string, { ts: string; sliceId?: string }> = {};

  for (const field of HALT_BADGE_FIELDS) {
    const value = snapshot[field];
    if (value === null || value === undefined) continue;
    // Only object-shaped badges get fanned out — primitives are dashboard
    // fields, not halt-badges (defense-in-depth against future drift).
    if (typeof value !== "object") continue;
    currentOpen[field] = context.sliceId ? { ts, sliceId: context.sliceId } : { ts };
    const payload: Record<string, unknown> = {
      schemaVersion: HALT_BADGE_SCHEMA_VERSION,
      badgeKind: field,
      ts,
      details: value
    };
    if (context.sliceId) payload.sliceId = context.sliceId;
    if (context.waveId) payload.waveId = context.waveId;
    try {
      await fanoutEnvelope(repoPath, "halt_badge", payload);
    } catch {
      // Fail-silent — snapshot remains authoritative.
    }
  }

  await fanoutResolvedHaltBadges(repoPath, currentOpen);
}

/**
 * Emit one `halt_badge.resolved` envelope per badge that transitioned
 * populated -> cleared since the previous `fanoutHaltBadgesFromSnapshot`
 * call. `resolverAgentRole` is best-effort (last auto-dispatch.jsonl entry)
 * and omitted entirely when unavailable — BE upsert is out-of-order safe
 * and tolerates its absence.
 */
async function fanoutResolvedHaltBadges(
  repoPath: string,
  currentOpen: Record<string, { ts: string; sliceId?: string }>
): Promise<void> {
  let resolved: ResolvedHaltBadgeEntry[];
  try {
    resolved = await diffHaltBadgeTransitions(repoPath, currentOpen);
  } catch {
    return;
  }
  if (resolved.length === 0) return;

  const resolverAgentRole = await resolveResolverAgentRole(repoPath);
  const resolvedAt = new Date().toISOString();
  for (const entry of resolved) {
    const payload: Record<string, unknown> = {
      schemaVersion: HALT_BADGE_SCHEMA_VERSION,
      badgeKind: entry.badgeKind,
      ts: entry.ts,
      resolvedAt
    };
    if (entry.sliceId) payload.sliceId = entry.sliceId;
    if (resolverAgentRole) payload.resolverAgentRole = resolverAgentRole;
    try {
      await fanoutEnvelope(repoPath, "halt_badge.resolved", payload);
    } catch {
      // Fail-silent — snapshot remains authoritative.
    }
  }
}
