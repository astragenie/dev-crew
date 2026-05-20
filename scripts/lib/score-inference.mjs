import fs from "node:fs/promises";
import path from "node:path";

// Reads crew review + validation + deployment artifacts and infers baseline
// scores per Wiggin Loop dimension. Heuristic-only; agent overrides during
// grade edit. Best-effort — missing artifacts mean no inference, no error.

async function pathExists(p) { try { await fs.access(p); return true; } catch { return false; } }

const ARTIFACT_DIRS = {
  reviews: ".claude/artifacts/crew/reviews",
  validations: ".claude/artifacts/crew/validations",
  deployments: ".claude/artifacts/crew/deployments"
};

// Patterns inferring score contribution per dimension. Each rule scans
// matching artifacts' content; if regex matches, adds value + source tag
// to the dimension's contribution list. Final score = average of values.
const INFERENCE_RULES = {
  test_confidence: [
    { source: "validations", re: /(?:^|[\s*])(?:verdict|status|decision)[*\s]*[:=][*\s]*PASS\b/i, value: 0.85 },
    { source: "validations", re: /(?:^|[\s*])(?:verdict|status|decision)[*\s]*[:=][*\s]*FAIL\b/i, value: 0.30 },
    { source: "reviews", re: /\b\d+\s+tests?\b/i, value: 0.80 }
  ],
  architecture_quality: [
    { source: "reviews", re: /(?:^|[\s*])(?:verdict|decision)[*\s]*[:=][*\s]*PASS\b/i, value: 0.85 },
    { source: "reviews", re: /(?:^|[\s*])(?:verdict|decision)[*\s]*[:=][*\s]*PASS with (?:minor|small)/i, value: 0.80 },
    { source: "reviews", re: /(?:^|[\s*])(?:verdict|decision)[*\s]*[:=][*\s]*FAIL\b/i, value: 0.40 }
  ],
  observability: [
    { source: "reviews", re: /\b(OTel|trace|span|metric|log[s]? added|telemetry)\b/i, value: 0.80 },
    { source: "validations", re: /\b(OTel|trace|span|metric|telemetry)\b/i, value: 0.80 }
  ],
  reliability: [
    { source: "reviews", re: /\b(retry|circuit breaker|fallback|graceful|idempoten[ct])\b/i, value: 0.80 }
  ],
  security: [
    { source: "reviews", re: /\b(auth|scope|audit|secret|key vault)\b/i, value: 0.80 }
  ],
  production_readiness: [
    { source: "deployments", re: /(?:^|[\s*])(?:verdict|decision)[*\s]*[:=][*\s]*PASS\b/i, value: 0.85 },
    { source: "deployments", re: /.+/s, value: 0.75 }
  ],
  product_completeness: [
    { source: "validations", re: /\bacceptance criteria.*PASS/i, value: 0.85 }
  ]
};

// Reads all .md files in a crew artifact dir whose body or filename mentions
// the given slice id (e.g. "SLICE-52" or "SLICE_52"). Returns the file list.
async function readArtifactsMentioningSlice(repoPath, dirRelative, sliceId) {
  const dir = path.join(repoPath, dirRelative);
  if (!(await pathExists(dir))) return [];
  const files = await fs.readdir(dir);
  const matching = [];
  // Match "SLICE-52" or "SLICE_52" or "slice 52" with word boundary
  const num = sliceId.match(/\d+/)?.[0];
  if (!num) return [];
  const re = new RegExp(`SLICE[-_ ]?0*${num}\\b`, "i");
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const full = path.join(dir, file);
    const content = await fs.readFile(full, "utf8");
    if (re.test(content) || re.test(file)) {
      matching.push({ path: full, content, filename: file });
    }
  }
  return matching;
}

export async function inferScoresForSlice(repoPath, sliceId) {
  if (!sliceId) return { scores: {}, sources: {} };
  const sources = {
    reviews: await readArtifactsMentioningSlice(repoPath, ARTIFACT_DIRS.reviews, sliceId),
    validations: await readArtifactsMentioningSlice(repoPath, ARTIFACT_DIRS.validations, sliceId),
    deployments: await readArtifactsMentioningSlice(repoPath, ARTIFACT_DIRS.deployments, sliceId)
  };

  const contributions = {};
  for (const [dim, rules] of Object.entries(INFERENCE_RULES)) {
    contributions[dim] = [];
    for (const rule of rules) {
      const artifacts = sources[rule.source] || [];
      for (const art of artifacts) {
        if (rule.re.test(art.content)) {
          contributions[dim].push({
            value: rule.value,
            source: art.filename,
            dir: rule.source
          });
        }
      }
    }
  }

  const scores = {};
  const sourcesPerDim = {};
  for (const [dim, contribs] of Object.entries(contributions)) {
    if (contribs.length === 0) continue;
    const values = contribs.map((c) => c.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    scores[dim] = Number(avg.toFixed(2));
    sourcesPerDim[dim] = contribs.map((c) => `${c.dir}/${c.source}`);
  }

  return {
    scores,
    sources: sourcesPerDim,
    artifactCounts: {
      reviews: sources.reviews.length,
      validations: sources.validations.length,
      deployments: sources.deployments.length
    }
  };
}
