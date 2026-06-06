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
    `- Suggested action: complete the slice in the original session, OR pass \`--allow-cross-session\` to \`node scripts/loop.mjs auto\` to override. Override logs a timestamped \`session-drift-override\` event to \`.claude/artifacts/loop/auto-dispatch.jsonl\`.`
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

/** Registry — order determines render order in the explain output. */
export const HALT_BADGES: HaltBadgeRenderer[] = [
  { field: "costRegression", gateName: "Cost regression", render: renderCostRegression },
  { field: "sessionDrift", gateName: "Session drift", render: renderSessionDrift },
  { field: "sliceCostCeiling", gateName: "Slice cost ceiling", render: renderSliceCostCeiling },
  { field: "gradeTrend", gateName: "Grade trend", render: renderGradeTrend }
];

/**
 * Build the `## Halt summary` markdown block from a brief object's snapshot.
 *
 * Looks for halt-badge fields at TWO locations:
 *   1. brief.snapshot.{costRegression, sessionDrift, sliceCostCeiling, gradeTrend}
 *      (when called against stop-check output shape)
 *   2. brief.{costRegression, sessionDrift, sliceCostCeiling, gradeTrend}
 *      (when called against `node scripts/loop.mjs brief` output shape — loop's
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
