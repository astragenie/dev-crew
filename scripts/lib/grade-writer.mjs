import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { mergeFrontmatter, parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { findFeatureById } from "./backlog-writer.mjs";
import { findSpecById } from "./spec-parser.mjs";
import {
  gradesRoot,
  gradeFilePath,
  readGrade,
  parseScoresFromBody,
  parseDecisionsFromBody,
  validateScores
} from "./grade-parser.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(scriptDir, "..", "..", "templates");

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function readTemplate(rel) {
  return fs.readFile(path.join(templateDir, rel), "utf8");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function findSliceFile(repoPath, sliceId, config) {
  // Slice files can live under <slicesRoot>/{pending,active,completed}/ or
  // flat in <slicesRoot>/ (LoopBrain pattern). Try both.
  const slicesRoot = path.join(repoPath, config?.loop?.slicesRoot || "docs/ai-loop/slices");
  if (!(await pathExists(slicesRoot))) return null;
  const stack = [slicesRoot];
  const slicePattern = sliceId.replace("-", "[_-]");
  const re = new RegExp(`^${slicePattern}(_|$)`, "i");
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (re.test(e.name)) return full;
    }
  }
  return null;
}

export async function createGradeFile(repoPath, sliceId, { config = null } = {}) {
  if (!sliceId) throw new Error("createGradeFile requires sliceId");
  const target = gradeFilePath(repoPath, sliceId, config);
  if (await pathExists(target)) {
    return { gradePath: target, created: false };
  }
  await ensureDir(gradesRoot(repoPath, config));

  // Resolve linked feature + spec for prefill
  const sliceFile = await findSliceFile(repoPath, sliceId, config);
  let featureId = null;
  let specId = null;
  let phase = null;
  let targetRelease = null;
  if (sliceFile) {
    const content = await fs.readFile(sliceFile, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    featureId = frontmatter.feature || null;
    phase = frontmatter.phase || null;
    targetRelease = frontmatter.target_release || null;
  }
  if (featureId) {
    const feat = await findFeatureById(repoPath, featureId, config);
    if (feat) {
      const df = feat.frontmatter.derived_from;
      specId = (Array.isArray(df) ? df[0] : df) || null;
      if (!targetRelease) targetRelease = feat.frontmatter.target_release || null;
    }
  }
  if (specId) {
    const spec = await findSpecById(repoPath, specId, config);
    if (!targetRelease && spec?.frontmatter?.target_release) {
      targetRelease = spec.frontmatter.target_release;
    }
  }

  // Auto-prefill scores from crew artifacts mentioning this slice.
  const { inferScoresForSlice } = await import("./score-inference.mjs");
  const inference = await inferScoresForSlice(repoPath, sliceId);

  let tpl = await readTemplate("grades/grade-template.md");
  // Token substitutions
  tpl = tpl
    .replace(/GRADE-SLICE-NN/g, `GRADE-${sliceId}`)
    .replace(/SLICE-NN: <title>/g, `${sliceId}: <fill title>`)
    .replace(/\bSLICE-NN\b/g, sliceId)
    .replace(/FEAT-NNN/g, featureId || "null")
    .replace(/YYYY-MM-DD/g, today());

  // Apply inferred scores to both the frontmatter scores: block AND the
  // mirror list in the body. Leave dimensions without inference at 0.00
  // so the agent's eye is drawn to them.
  for (const [dim, value] of Object.entries(inference.scores)) {
    const fixed = value.toFixed(2);
    tpl = tpl.replace(new RegExp(`^(  ${dim}): 0$`, "m"), `$1: ${fixed}`);
    tpl = tpl.replace(new RegExp(`(- ${dim}): 0\\.00`), `$1: ${fixed}`);
  }
  // Append a note about inference sources so the agent knows which artifacts
  // contributed; agent can override any score with confidence.
  if (Object.keys(inference.scores).length > 0) {
    const sourceLines = Object.entries(inference.sources)
      .map(([dim, srcs]) => `- ${dim}: ${srcs.join(", ")}`)
      .join("\n");
    tpl = tpl.replace(
      "(Update both the frontmatter `scores:` map and this list. The frontmatter\nis what plugin commands read; the list is for human review.)",
      `(Scores prefilled from crew artifacts where signals were available. Override any value if your honest assessment differs.)\n\n### Inference sources\n\n${sourceLines}`
    );
  }

  // Patch frontmatter with resolved values via simple regex on the template
  tpl = tpl
    .replace(/^(spec):\s*null/m, `$1: ${specId || "null"}`)
    .replace(/^(phase):\s*null/m, `$1: ${phase ?? "null"}`)
    .replace(/^(target_release):\s*null/m, `$1: ${targetRelease || "null"}`)
    .replace(/^(feature):\s*FEAT-NNN/m, `$1: ${featureId || "null"}`);

  await fs.writeFile(target, tpl);
  return {
    gradePath: target,
    created: true,
    prefilled: { featureId, specId, phase, targetRelease }
  };
}

// Write back the grade after agent edits: validate scores, extract DEC-TBD
// blocks into docs/decisions/, replace TBD ids in grade body with allocated
// ids, update frontmatter `decisions: [DEC-NNN, ...]`. Idempotent.
export async function writeGrade(repoPath, sliceId, { config = null } = {}) {
  const target = gradeFilePath(repoPath, sliceId, config);
  if (!(await pathExists(target))) {
    throw new Error(`Grade file not found for ${sliceId}: ${target}`);
  }
  const content = await fs.readFile(target, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  const scores = parseScoresFromBody(body);
  const scoreErrors = validateScores(scores);
  if (scoreErrors.length > 0) {
    const err = new Error(`Score validation failed:\n  - ${scoreErrors.join("\n  - ")}`);
    err.code = "SCORE_VALIDATION";
    throw err;
  }

  const decisions = parseDecisionsFromBody(body);
  const { allocated, updatedBody } = await extractDecisions(
    repoPath,
    sliceId,
    body,
    decisions,
    config
  );

  // Build merged decisions list: existing IDs (already allocated) + newly allocated
  const existingIds = decisions.filter((d) => d.id !== "DEC-TBD").map((d) => d.id);
  const newIds = allocated.map((d) => d.id);
  const allIds = [...new Set([...existingIds, ...newIds])];

  // Persist updated body + frontmatter
  const updates = {
    decisions: allIds,
    graded_at: frontmatter.graded_at || today()
  };
  // Manually rebuild file: we already have updatedBody; just re-serialize frontmatter on top.
  const newContent = serializeFrontmatter({ ...frontmatter, ...updates }, updatedBody);
  await fs.writeFile(target, newContent);

  // Telemetry
  const { logEvent } = await import("./telemetry.mjs");
  await logEvent(repoPath, {
    command: "slice grade-write",
    slice: sliceId,
    decisions_extracted: newIds.length,
    decisions_total: allIds.length,
    scores_average: averageOf(scores)
  });

  return {
    gradePath: target,
    sliceId,
    scoresAverage: averageOf(scores),
    decisionsAllocated: newIds,
    decisionsTotal: allIds.length
  };
}

function averageOf(scores) {
  const vals = Object.values(scores).filter((v) => typeof v === "number");
  if (vals.length === 0) return null;
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3));
}

async function extractDecisions(repoPath, sliceId, body, decisions, config) {
  if (!decisions || decisions.length === 0) {
    return { allocated: [], updatedBody: body };
  }
  const { nextDecisionId, writeDecisionFile } = await import("./decisions-store.mjs");
  const allocated = [];
  let updatedBody = body;
  for (const dec of decisions) {
    if (dec.id !== "DEC-TBD") continue;
    const id = await nextDecisionId(repoPath, config);
    await writeDecisionFile(repoPath, {
      id,
      title: dec.title,
      sliceId,
      rationale: dec.rationale,
      consequences: dec.consequences,
      config
    });
    // Replace the first DEC-TBD occurrence in the body with the allocated id
    updatedBody = updatedBody.replace(/###\s+DEC-TBD\s*:\s*/, `### ${id}: `);
    allocated.push({ id, title: dec.title });
  }
  return { allocated, updatedBody };
}
