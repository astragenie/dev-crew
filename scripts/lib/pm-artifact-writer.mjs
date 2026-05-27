/**
 * pm-artifact-writer.mjs — writes PM review artifact files under
 * .claude/artifacts/loop/pm-reviews/.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { serializeFrontmatter } from "./frontmatter.mjs";
import { PM_DIMENSIONS } from "./pm-scorer.mjs";

const PM_REVIEWS_SUBPATH = ".claude/artifacts/loop/pm-reviews";

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Write a PM review artifact for a feature.
 *
 * @param {string} repoPath - Absolute path to the repository root.
 * @param {object} options
 * @param {string}  options.featureId        - e.g. "FEAT-001"
 * @param {Record<string, number>} options.scores - One entry per PM_DIMENSION
 * @param {string}  options.compositePriority - "P0"|"P1"|"P2"|"P3"
 * @param {boolean} options.autonomousSafe
 * @param {string}  [options.demandEvidence]  - Optional demand evidence text
 * @param {string}  [options.scopeNotes]      - Optional scope notes
 * @param {string[]} [options.risks]          - Optional list of risk bullets
 * @param {string}  [options.reasoning]       - Optional one-line priority reasoning
 * @returns {Promise<{ artifactPath: string, id: string }>}
 */
export async function writePmReviewArtifact(repoPath, options = {}) {
  const {
    featureId,
    scores = {},
    compositePriority,
    autonomousSafe,
    demandEvidence,
    scopeNotes,
    risks,
    reasoning
  } = options;

  if (!featureId) {
    throw new Error("writePmReviewArtifact: featureId is required");
  }

  const dir = path.join(repoPath, PM_REVIEWS_SUBPATH);
  await fs.mkdir(dir, { recursive: true });

  const id = `PM-REVIEW-${featureId}`;

  // Build frontmatter object
  const frontmatter = {
    id,
    feature: featureId,
    reviewed_at: today()
  };

  // Add pm_* score fields in canonical dimension order
  for (const dim of PM_DIMENSIONS) {
    const val = scores[dim] ?? 0;
    frontmatter[`pm_${dim}`] = val;
  }

  frontmatter.composite_priority = compositePriority ?? "P2";
  frontmatter.autonomous_safe = autonomousSafe ?? false;

  // Build body sections
  const evidenceText = demandEvidence || "none";
  const scopeText = scopeNotes || "none";

  const scoresLines = PM_DIMENSIONS.map((dim) => {
    const val = scores[dim] ?? 0;
    return `- ${dim}: ${val.toFixed(2)}`;
  }).join("\n");

  const risksList =
    Array.isArray(risks) && risks.length > 0 ? risks.map((r) => `- ${r}`).join("\n") : "- none";

  const reasoningText = reasoning || "none";

  const body = `# PM Review — ${featureId}

## Demand Assessment

- **Evidence:** ${evidenceText}

## Scope Challenge

- **Scope notes:** ${scopeText}

## Scores

${scoresLines}

## Priority Derivation

composite_priority: ${compositePriority ?? "P2"}
autonomous_safe: ${autonomousSafe ?? false}
reasoning: ${reasoningText}

## Risks

${risksList}
`;

  const content = serializeFrontmatter(frontmatter, body);

  const artifactPath = path.join(dir, `${featureId}-pm-review.md`);
  await fs.writeFile(artifactPath, content, "utf8");

  return { artifactPath, id };
}
