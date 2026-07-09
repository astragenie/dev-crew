import { listGrades, SCORE_DIMENSIONS } from "./grade-parser.mjs";
import { listBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";

// Cheap pattern-detection over grades + backlog + specs. No LLM. Returns an
// array of alert objects suitable for inclusion in status / brief output.
//
// Each alert: { severity: "warn"|"info", category, message, suggested_action }.

const DEFAULT_SCORE_THRESHOLD = 0.8;
const DEFAULT_TRAILING_SLICES = 3;

function isValidThreshold(v: unknown): v is number {
  return typeof v === "number" && v > 0 && v <= 1;
}

function isValidTrailing(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

export function resolveScoreTrendConfig(config: any): {
  threshold: number;
  trailing: number;
  perDim: Record<string, number>;
} {
  const loop = config?.loop ?? {};

  const threshold = isValidThreshold(loop.gradeTrendThreshold)
    ? loop.gradeTrendThreshold
    : DEFAULT_SCORE_THRESHOLD;

  const trailing = isValidTrailing(loop.gradeTrendConsecutiveLimit)
    ? loop.gradeTrendConsecutiveLimit
    : DEFAULT_TRAILING_SLICES;

  const perDimRaw = loop.gradeTrendPerDimension;
  const perDim: Record<string, number> = {};
  if (perDimRaw && typeof perDimRaw === "object" && !Array.isArray(perDimRaw)) {
    for (const [dim, val] of Object.entries(perDimRaw)) {
      if (isValidThreshold(val)) {
        perDim[dim] = val as number;
      }
      // invalid per-dim values silently fall back to global threshold (no entry added)
    }
  }

  return { threshold, trailing, perDim };
}

function detectScoreTrendAlerts(grades: Record<string, any>[], config: unknown) {
  const { threshold, trailing, perDim } = resolveScoreTrendConfig(config);
  if (grades.length < trailing) return [];
  const recent = grades.slice(-trailing);
  const out: Record<string, string>[] = [];
  for (const dim of SCORE_DIMENSIONS) {
    const dimThreshold = perDim[dim] ?? threshold;
    const allLow = recent.every((g: Record<string, any>) => {
      const v = g.scores?.[dim];
      return typeof v === "number" && v < dimThreshold;
    });
    if (allLow) {
      out.push({
        severity: "warn",
        category: "score-trend",
        message: `${dim} below ${dimThreshold} across last ${trailing} slices`,
        suggested_action: `Author a SPEC (type=sre or type=adr) addressing the ${dim} gap, or revisit the slice template for that dimension.`
      });
    }
  }
  return out;
}

function detectDecompositionAlerts(backlog: Record<string, any>[]) {
  const out: Record<string, string>[] = [];
  for (const f of backlog) {
    const slices = Array.isArray(f.frontmatter.slices) ? f.frontmatter.slices : [];
    if (slices.length >= 3) {
      if (f.state === "done") {
        out.push({
          severity: "info",
          category: "decomposition",
          message: `${f.id} shipped with ${slices.length} slices — consider capturing the pattern as a SPEC if recurring`,
          suggested_action: `Capture pattern as SPEC retroactively only if recurring.`
        });
      } else {
        out.push({
          severity: "warn",
          category: "decomposition",
          message: `${f.id} has spawned ${slices.length} slices`,
          suggested_action: `Review feature scope — split into smaller features or capture the pattern as a SPEC.`
        });
      }
    }
  }
  return out;
}

function detectSpecFlowAlerts(specs: Record<string, any>[]) {
  const out: Record<string, string>[] = [];
  for (const s of specs) {
    const derived = Array.isArray(s.frontmatter.derived_features)
      ? s.frontmatter.derived_features
      : [];
    if (s.frontmatter.status === "approved" && derived.length === 0) {
      out.push({
        severity: "info",
        category: "spec-flow",
        message: `${s.id} is approved but not yet decomposed into features`,
        suggested_action: `Run /loop:spec decompose --id ${s.id} --features "title 1; title 2; ..."`
      });
    }
  }
  return out;
}

function detectBacklogFlowAlerts(backlog: Record<string, any>[]) {
  const pending = backlog.filter((f) => f.state === "pending");
  if (pending.length < 10) return [];
  return [
    {
      severity: "info",
      category: "backlog-flow",
      message: `${pending.length} features pending triage`,
      suggested_action: `Run /loop:triage to dispatch the PM agent for 5-dimension scoring.`
    }
  ];
}

const DEFAULT_NOT_CHECKED_THRESHOLD = 3;

function isValidThresholdCount(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

/**
 * Resolve config for detectNotCheckedEmptyAlerts.
 *
 * `not_checked` is a brand-new grade/review frontmatter field (FEAT-180 /
 * issue #247, see reviewerPrompt() in post-builder-fanout.mts). Every grade
 * artifact written before this feature shipped has NO `not_checked` field
 * at all — not even an empty array — because the field didn't exist yet.
 * If this detector defaulted to "on", replaying an existing repo's grade
 * history would immediately trip a warn alert purely because the recent
 * window predates the feature, not because any reviewer actually skipped
 * documenting their blind spots. That's a false positive on 100% of repos
 * upgrading to this version, on day one, with zero signal value.
 *
 * So: default OFF (`enabled: false`). A repo opts in explicitly once its
 * trailing grade window is expected to be dominated by post-FEAT-180
 * reviews, via `loop.notCheckedAlertEnabled: true` in `.claude/loop.json`.
 */
export function resolveNotCheckedConfig(config: any): { enabled: boolean; threshold: number } {
  const loop = config?.loop ?? {};
  const enabled = loop.notCheckedAlertEnabled === true;
  const threshold = isValidThresholdCount(loop.notCheckedAlertThreshold)
    ? loop.notCheckedAlertThreshold
    : DEFAULT_NOT_CHECKED_THRESHOLD;
  return { enabled, threshold };
}

// Counts consecutive grades (most-recent-first, i.e. walking the end of the
// `listGrades()`-sorted array backward) whose `not_checked` field is absent
// or empty. Mirrors the consecutiveBelow-style counter shape used by
// detectScoreTrendAlerts above, but walks true consecutive runs from the
// most recent grade rather than a fixed trailing window, since a single
// recent non-empty `not_checked` should reset the streak.
function detectNotCheckedEmptyAlerts(grades: Record<string, any>[], config: unknown) {
  const { enabled, threshold } = resolveNotCheckedConfig(config);
  if (!enabled) return [];
  let consecutiveEmpty = 0;
  for (let i = grades.length - 1; i >= 0; i -= 1) {
    const notChecked = grades[i]?.notChecked;
    if (Array.isArray(notChecked) && notChecked.length > 0) break;
    consecutiveEmpty += 1;
  }
  if (consecutiveEmpty < threshold) return [];
  return [
    {
      severity: "warn",
      category: "not-checked-empty",
      message: `not_checked missing or empty across last ${consecutiveEmpty} consecutive reviews`,
      suggested_action: `Ensure reviewers pass --not-checked "<a,b>" (>=2 items) to crew write-review-result per the reviewer-prompt contract.`
    }
  ];
}

function detectInProgressOrphanAlerts(backlog: Record<string, any>[]) {
  const out: Record<string, string>[] = [];
  for (const f of backlog.filter((b) => b.state === "in-progress")) {
    const slices = Array.isArray(f.frontmatter.slices) ? f.frontmatter.slices : [];
    if (slices.length === 0) {
      out.push({
        severity: "warn",
        category: "in-progress-orphan",
        message: `${f.id} is in-progress but has no linked slice`,
        suggested_action: `Run /loop:slice from-feature --id ${f.id}.`
      });
    }
  }
  return out;
}

export async function detectPatterns(
  repoPath: string,
  { config = null }: Record<string, unknown> = {}
) {
  const [grades, backlog, specs] = await Promise.all([
    listGrades(repoPath, { config }),
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config })
  ]);
  return [
    ...detectScoreTrendAlerts(grades, config),
    ...detectDecompositionAlerts(backlog),
    ...detectSpecFlowAlerts(specs),
    ...detectBacklogFlowAlerts(backlog),
    ...detectInProgressOrphanAlerts(backlog),
    ...detectNotCheckedEmptyAlerts(grades, config)
  ];
}
