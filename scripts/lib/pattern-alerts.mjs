import { listGrades, SCORE_DIMENSIONS } from "./grade-parser.mjs";
import { listBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";

// Cheap pattern-detection over grades + backlog + specs. No LLM. Returns an
// array of alert objects suitable for inclusion in status / brief output.
//
// Each alert: { severity: "warn"|"info", category, message, suggested_action }.

const SCORE_THRESHOLD = 0.8;
const TRAILING_SLICES = 3;

export async function detectPatterns(repoPath, { config = null } = {}) {
  const [grades, backlog, specs] = await Promise.all([
    listGrades(repoPath, { config }),
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config })
  ]);
  const alerts = [];

  // 1. Score dimension consistently below threshold across last N slices
  if (grades.length >= TRAILING_SLICES) {
    const recent = grades.slice(-TRAILING_SLICES);
    for (const dim of SCORE_DIMENSIONS) {
      const allLow = recent.every((g) => {
        const v = g.scores?.[dim];
        return typeof v === "number" && v < SCORE_THRESHOLD;
      });
      if (allLow) {
        alerts.push({
          severity: "warn",
          category: "score-trend",
          message: `${dim} below ${SCORE_THRESHOLD} across last ${TRAILING_SLICES} slices`,
          suggested_action: `Author a SPEC (type=sre or type=adr) addressing the ${dim} gap, or revisit the slice template for that dimension.`
        });
      }
    }
  }

  // 2. Single feature spawning ≥3 slices (decomposition signal)
  for (const f of backlog) {
    const slices = Array.isArray(f.frontmatter.slices) ? f.frontmatter.slices : [];
    if (slices.length >= 3) {
      alerts.push({
        severity: "warn",
        category: "decomposition",
        message: `${f.id} has spawned ${slices.length} slices`,
        suggested_action: `Review feature scope — split into smaller features or capture the pattern as a SPEC.`
      });
    }
  }

  // 3. Specs in approved status but undecomposed
  for (const s of specs) {
    const status = s.frontmatter.status;
    const derived = Array.isArray(s.frontmatter.derived_features)
      ? s.frontmatter.derived_features
      : [];
    if (status === "approved" && derived.length === 0) {
      alerts.push({
        severity: "info",
        category: "spec-flow",
        message: `${s.id} is approved but not yet decomposed into features`,
        suggested_action: `Run /autonomous-loop:spec decompose --id ${s.id} --features "title 1; title 2; ..."`
      });
    }
  }

  // 4. Pending backlog growing without triage cadence
  const pending = backlog.filter((f) => f.state === "pending");
  if (pending.length >= 10) {
    alerts.push({
      severity: "info",
      category: "backlog-flow",
      message: `${pending.length} features pending triage`,
      suggested_action: `Run /autonomous-loop:backlog triage to assign priority + category.`
    });
  }

  // 5. In-progress features with no linked slice
  for (const f of backlog.filter((b) => b.state === "in-progress")) {
    const slices = Array.isArray(f.frontmatter.slices) ? f.frontmatter.slices : [];
    if (slices.length === 0) {
      alerts.push({
        severity: "warn",
        category: "in-progress-orphan",
        message: `${f.id} is in-progress but has no linked slice`,
        suggested_action: `Run /autonomous-loop:slice from-feature --id ${f.id}.`
      });
    }
  }

  return alerts;
}
