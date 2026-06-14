// Halt-badge registry + renderers (FEAT-065 / SLICE-61).
// Single source of truth for `--explain-halts` rendering. Mirrors the
// documentation in docs/halt-badges.md (FEAT-063). Unknown future fields
// degrade gracefully — the iterator only renders fields it knows about.

export interface HaltBadgeRenderer {
  /** snapshot field name, e.g. "costRegression" */
  field: string;
  /** human-readable gate name for the rendered block heading */
  gateName: string;
  /** Returns the body lines when the badge is non-null; empty array when null. */
  render: (entry: any) => string[];
}

export interface HaltBadgeInfo {
  /** Severity level: "info" | "warn" | "error" */
  severity: "info" | "warn" | "error";
  /** Human-readable description of the badge */
  description: string;
}

function renderCostRegression(e: any): string[] {
  if (!e) return [];
  return [
    `- Current spend: $${e.currentUsd?.toFixed?.(2) ?? e.currentUsd}`,
    `- Rolling median: $${e.medianUsd?.toFixed?.(2) ?? e.medianUsd} × multiplier ${e.multiplier} = threshold $${e.thresholdUsd?.toFixed?.(2) ?? e.thresholdUsd}`,
    `- Window: last ${e.window} reports (sampleCount ${e.sampleCount})`,
    `- Suggested action: review the runaway slice; either accept the trajectory and bump \`loop.costRegressionMultiplier\` in \`.claude/loop.json\`, or halt and investigate.`
  ];
}

function renderSessionDrift(e: any): string[] {
  if (!e) return [];
  return [
    `- Session at slice-start: ${e.sessionIdAtStart}`,
    `- Current session: ${e.sessionIdNow}`,
    `- Suggested action: complete the slice in the original session, OR pass \`--allow-cross-session\` to \`bun src/scripts/loop.mts auto\` to override. Override logs a timestamped \`session-drift-override\` event to \`.claude/artifacts/loop/auto-dispatch.jsonl\`.`
  ];
}

function renderSliceCostCeiling(e: any): string[] {
  if (!e) return [];
  return [
    `- Actual spend: $${e.actualUsd?.toFixed?.(2) ?? e.actualUsd}`,
    `- Configured ceiling: $${e.ceilingUsd?.toFixed?.(2) ?? e.ceilingUsd}`,
    `- Suggested action: investigate whether the slice scope is too broad. Either narrow the slice and re-open, or accept the cost and raise \`loop.costSliceCeiling\` in \`.claude/loop.json\`.`
  ];
}

function renderGradeTrend(e: any): string[] {
  if (!e) return [];
  return [
    `- Consecutive slices below threshold: ${e.consecutiveBelow}`,
    `- Threshold: ${e.threshold}`,
    `- Suggested action: stop and review the slice template for the dimension that fell, or author a SPEC addressing the gap. Walker halts unless \`autoMode\` is on AND the category appears in \`loop.warnAlertCategoriesIgnoredInAutoMode\`.`
  ];
}

function renderMergeFailed(e: any): string[] {
  if (!e) return [];
  const fixHint =
    e.code === "PUSH_FAILED"
      ? `Run \`git push origin main\` manually — the commit is on local main.`
      : `Run \`/crew:fix\` against worktree \`${e.attemptedWorktree}\` to resume.`;
  return [
    `- Slice: ${e.slice}${e.feature ? ` / ${e.feature}` : ""}`,
    `- Failed step: ${e.failedStep} (code ${e.code})`,
    `- Branch: \`${e.attemptedBranch}\``,
    `- Worktree: \`${e.attemptedWorktree}\``,
    `- Suggested action: ${fixHint}`
  ];
}

function renderRedundantReadStop(e: any): string[] {
  if (!e) return [];
  return [
    `- Worst-offender path: \`${e.path}\``,
    `- Reads counted: ${e.maxReadCount} (threshold ${e.threshold})`,
    `- Session: ${e.sessionId}`,
    `- Total offending paths: ${e.offendingPathCount}`,
    `- Suggested action: trust prior Read; tune \`loop.redundantReadCap\` in \`.claude/loop.json\` to adjust the gate.`
  ];
}

function renderMarathonCheckpoint(e: any): string[] {
  if (!e) return [];
  return [
    `- Level: ${e.level} (warn = advisory, hard = stop)`,
    `- Slices closed since last retrospective: ${e.closesSinceCheckpoint}`,
    `- Configured threshold: \`marathonCheckpointEvery\` = ${e.every} (hard at ${e.hardThreshold})`,
    `- Last retrospective: ${e.lastRetroPath ? `\`${e.lastRetroPath}\`` : "none"}`,
    `- Suggested action: run \`/loop:retrospective\` to capture lessons. The walker resumes the next slice once a fresh retrospective lands under \`.claude/artifacts/loop/retrospectives/\`.`
  ];
}

function renderPausedForExternalEvent(e: any): string[] {
  if (!e) return [];
  return [
    `- Reason: ${e.reason}`,
    `- Paused at: ${e.pausedAt}`,
    `- Resume hint: ${e.resumeHint}`,
    `- Suggested action: run \`bun src/scripts/loop.mts resume --repo .\` once the external event has resolved. The walker resumes from the current backlog state — no checkpoint replay needed.`
  ];
}

function renderStuckDetected(e: any): string[] {
  if (!e) return [];
  return [
    `- Slice: ${e.sliceId}`,
    `- Builder attempts without PASS: ${e.attempts} (threshold ${e.threshold})`,
    `- Last attempt at: ${e.lastAttemptAt}`,
    `- Suggested action: run \`bun src/scripts/loop.mts stuck-reset\` to clear the counter, then investigate builder failures. Consider narrowing scope or fixing the root cause before re-dispatching.`
  ];
}

function renderPrWatch(e: any): string[] {
  if (!e) return [];
  const lines = [`- Halt reason: ${e.haltReason}`];
  if (e.haltReason === "max-retries") {
    lines.push(`- Retries used: ${e.retriesUsed}`);
    lines.push(
      "- Suggested action: inspect the failing checks manually and push a fix. Re-run `bun src/scripts/loop.mts pr-watch <PR-URL>` after the fix."
    );
  } else if (e.haltReason === "cost-exceeded") {
    lines.push(`- Cumulative cost: $${e.cumulativeCostUsd?.toFixed?.(2) ?? e.cumulativeCostUsd}`);
    lines.push(
      "- Suggested action: review failing checks for scope creep. Raise `loop.prWatch.maxCostUsd` in `.claude/loop.json` or fix the checks manually."
    );
  } else if (e.haltReason === "pr-closed") {
    lines.push("- Suggested action: the PR was closed without merging. No loop action possible.");
  }
  return lines;
}

/** Registry — order determines render order in the explain output. */
export const HALT_BADGES: HaltBadgeRenderer[] = [
  { field: "costRegression", gateName: "Cost regression", render: renderCostRegression },
  { field: "sessionDrift", gateName: "Session drift", render: renderSessionDrift },
  { field: "sliceCostCeiling", gateName: "Slice cost ceiling", render: renderSliceCostCeiling },
  { field: "gradeTrend", gateName: "Grade trend", render: renderGradeTrend },
  { field: "mergeFailed", gateName: "Merge failed", render: renderMergeFailed },
  {
    field: "redundantReadStop",
    gateName: "Redundant read stop",
    render: renderRedundantReadStop
  },
  {
    field: "marathonCheckpoint",
    gateName: "Marathon checkpoint",
    render: renderMarathonCheckpoint
  },
  {
    field: "pausedForExternalEvent",
    gateName: "Paused for external event",
    render: renderPausedForExternalEvent
  },
  { field: "stuckDetected", gateName: "Stuck detector", render: renderStuckDetected },
  { field: "prWatch", gateName: "PR watch halt", render: renderPrWatch }
];

/** Wave-mode halt-badge registry: badge ID → severity + description. */
const WAVE_HALT_BADGES: Record<string, HaltBadgeInfo> = {
  wave_post_merge_red: {
    severity: "error",
    description:
      "Post-merge test suite returned non-zero after wave merge to main."
  },
  wave_dirty_main: {
    severity: "error",
    description: "Wave runner detected a dirty main branch before dispatching; refusing to proceed."
  },
  wave_pending_fix_count: {
    severity: "info",
    description:
      "Count of slices with pending_fix=true; planner will pick them first next wave."
  },
  wave_escalation_count: {
    severity: "warn",
    description:
      "Slices moved to needs-review/ since the last retrospective due to repeated wave failures."
  }
};

/**
 * Look up a halt-badge by ID and return its severity and description.
 * Includes both wave-mode badges and legacy snapshot badges.
 * Throws if the badge ID is not registered.
 */
export function explainHaltBadge(id: string): HaltBadgeInfo {
  // Check wave-mode registry first
  if (id in WAVE_HALT_BADGES) {
    return WAVE_HALT_BADGES[id]!;
  }

  // Check legacy HALT_BADGES registry
  for (const badge of HALT_BADGES) {
    if (badge.field === id) {
      // For legacy badges, infer severity from context
      const severity: "info" | "warn" | "error" = badge.field.includes("regression")
        ? "error"
        : badge.field.includes("checkpoint")
          ? "warn"
          : "error";
      return {
        severity,
        description: badge.gateName
      };
    }
  }

  throw new Error(`Unknown halt-badge ID: ${id}`);
}

/**
 * Build the `## Halt summary` markdown block from a brief object's snapshot.
 *
 * Looks for halt-badge fields at TWO locations:
 *   1. brief.snapshot.{costRegression, sessionDrift, sliceCostCeiling, gradeTrend}
 *      (when called against stop-check output shape)
 *   2. brief.{costRegression, sessionDrift, sliceCostCeiling, gradeTrend}
 *      (when called against `bun src/scripts/loop.mts brief` output shape — loop's
 *      own brief currently surfaces costRegression + sessionDrift at top level)
 *
 * When both exist, the snapshot.* form wins.
 *
 * Returns the full block including the `## Halt summary` heading and trailing newline.
 */
export function explainHalts(brief: any): string {
  const lines: string[] = ["## Halt summary", ""];
  const snapshot = brief?.snapshot ?? {};
  let firedCount = 0;
  for (const badge of HALT_BADGES) {
    const entry = snapshot[badge.field] ?? brief?.[badge.field] ?? null;
    if (!entry) continue;
    firedCount++;
    lines.push(`### ${badge.gateName} (\`${badge.field}\`)`, "");
    lines.push(...badge.render(entry));
    lines.push("");
  }
  if (firedCount === 0) {
    lines.push("No halts active.", "");
  }
  return lines.join("\n");
}
