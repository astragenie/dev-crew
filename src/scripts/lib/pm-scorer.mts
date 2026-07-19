/**
 * pm-scorer.mjs — deterministic PM scoring logic for backlog items.
 *
 * Provides dimension definitions, validation, composite priority derivation,
 * autonomous-safe classification, and frontmatter parsing helpers.
 */

/** The five PM scoring dimensions, in canonical order. */
export const PM_DIMENSIONS = [
  "customer_impact",
  "effort_estimate",
  "strategic_alignment",
  "technical_risk",
  "dependency_depth"
];

/**
 * Validate a scores object against PM_DIMENSIONS.
 *
 * @param {Record<string, unknown>} scores
 * @returns {string[]} Array of error strings; empty when valid.
 */
export function validatePmScores(scores: Record<string, unknown>) {
  const errors: any[] = [];
  for (const dim of PM_DIMENSIONS) {
    const v = scores[dim];
    if (v === undefined || v === null) {
      errors.push(`missing dimension: ${dim}`);
      continue;
    }
    if (typeof v !== "number" || Number.isNaN(v)) {
      errors.push(`${dim} must be a number, got ${typeof v}`);
      continue;
    }
    if (v < 0 || v > 1) {
      errors.push(`${dim} = ${v} out of range [0, 1]`);
    }
  }
  return errors;
}

/**
 * Derive a composite priority band from PM scores.
 *
 * Rules (evaluated in order; first match wins):
 *   P0 — impact >= 0.8 AND (category === "bugfix" OR risk >= 0.8)
 *   P1 — (impact >= 0.7 AND alignment >= 0.6) OR (alignment >= 0.8 AND effort <= 0.4)
 *   P3 — effort >= 0.7 AND impact <= 0.3
 *   P2 — everything else
 *
 * @param {Record<string, number>} scores
 * @param {string} [category="feature"]
 * @returns {"P0"|"P1"|"P2"|"P3"}
 */
export function computeCompositePriority(scores: Record<string, number>, category = "feature") {
  const impact = scores.customer_impact ?? 0;
  const effort = scores.effort_estimate ?? 0;
  const alignment = scores.strategic_alignment ?? 0;
  const risk = scores.technical_risk ?? 0;

  if (impact >= 0.8 && (category === "bugfix" || risk >= 0.8)) {
    return "P0";
  }

  if ((impact >= 0.7 && alignment >= 0.6) || (alignment >= 0.8 && effort <= 0.4)) {
    return "P1";
  }

  if (effort >= 0.7 && impact <= 0.3) {
    return "P3";
  }

  return "P2";
}

/**
 * Determine whether a backlog item is safe for autonomous execution.
 *
 * Returns false when any of these conditions hold:
 *   - technical_risk > 0.6
 *   - effort_estimate > 0.6
 *   - dependency_depth > 0.6
 *   - neither hasSpec nor hasAcceptanceCriteria is true
 *
 * @param {Record<string, number>} scores
 * @param {{ hasSpec?: boolean, hasAcceptanceCriteria?: boolean }} [context={}]
 * @returns {boolean}
 */
export function computeAutonomousSafe(
  scores: Record<string, number>,
  context: Record<string, any> = {}
) {
  const { hasSpec = false, hasAcceptanceCriteria = false } = context;

  if ((scores.technical_risk ?? 0) > 0.6) return false;
  if ((scores.effort_estimate ?? 0) > 0.6) return false;
  if ((scores.dependency_depth ?? 0) > 0.6) return false;
  if (!hasSpec && !hasAcceptanceCriteria) return false;

  return true;
}

/**
 * Compute the arithmetic mean of all PM dimensions that are present
 * and numeric in `scores`.
 *
 * @param {Record<string, unknown>} scores
 * @returns {number|null} Mean value, or null when no valid dimension exists.
 */
export function averagePmScore(scores: Record<string, unknown>) {
  const values = PM_DIMENSIONS.map((d) => scores[d]).filter(
    (v): v is number => typeof v === "number" && !Number.isNaN(v)
  );
  if (values.length === 0) return null;
  const raw = values.reduce((a, b) => a + b, 0) / values.length;
  // Round to 10 decimal places to avoid IEEE 754 noise (e.g. 0.4000000000000001).
  return Math.round(raw * 1e10) / 1e10;
}

/**
 * Extract PM scores from a flat frontmatter object.
 *
 * Reads keys of the form `pm_<dimension>` and returns a scores object
 * with dimension names as keys.
 *
 * @param {Record<string, unknown>} frontmatter
 * @returns {Record<string, number>}
 */
export function parsePmScoresFromFrontmatter(frontmatter: Record<string, unknown>) {
  const scores: Record<string, unknown> = {};
  for (const dim of PM_DIMENSIONS) {
    const key = `pm_${dim}`;
    if (Object.hasOwn(frontmatter, key)) {
      scores[dim] = frontmatter[key];
    }
  }
  return scores;
}
