export type RiskTier = "low" | "medium" | "high";

export type FeatFrontmatterForRisk = {
  tags?: string[];
  pm_technical_risk?: number;
  pm_customer_impact?: number;
  category?: string;
  priority?: string;
};

function isHighRisk(feat: FeatFrontmatterForRisk, tags: string[]): boolean {
  if (
    tags.includes("concern:security") ||
    tags.includes("concern:governance") ||
    tags.includes("surface:schema") ||
    tags.includes("surface:api")
  ) {
    return true;
  }
  return (
    (feat.pm_technical_risk ?? 0) >= 0.7 ||
    feat.category === "security" ||
    feat.priority === "P0" ||
    (feat.pm_customer_impact ?? 0) >= 0.85
  );
}

function isLowRisk(feat: FeatFrontmatterForRisk, tags: string[]): boolean {
  if (feat.category === "docs" || tags.includes("docs-only")) return true;
  return (feat.pm_technical_risk ?? 1) < 0.3 && (feat.pm_customer_impact ?? 1) < 0.4;
}

/**
 * Classifies a FEAT's risk tier based on its frontmatter fields.
 *
 * Rule table (first match wins):
 *
 * HIGH if any of:
 *   - tags includes "concern:security" or "concern:governance"
 *   - tags includes "surface:schema" or "surface:api"
 *   - pm_technical_risk >= 0.7
 *   - category === "security"
 *   - priority === "P0"
 *   - pm_customer_impact >= 0.85
 *
 * LOW if any of (only when not already HIGH):
 *   - category === "docs"
 *   - tags includes "docs-only"
 *   - pm_technical_risk < 0.3 && pm_customer_impact < 0.4
 *
 * MEDIUM -- default if no HIGH or LOW trigger matched.
 *
 * Missing numeric fields: treated as 0 for HIGH checks (conservative --
 * missing data never inflates to HIGH on its own), as 1 for LOW checks
 * (conservative -- missing data prefers MEDIUM/HIGH over LOW when data is absent).
 * Missing tags: treated as empty array.
 */
export function classifyRisk(feat: FeatFrontmatterForRisk): RiskTier {
  const tags = feat.tags ?? [];
  if (isHighRisk(feat, tags)) return "high";
  if (isLowRisk(feat, tags)) return "low";
  return "medium";
}
