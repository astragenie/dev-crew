import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { findFeatureById } from "./backlog-writer.mjs";
import { renderIdentification } from "./slice-linker/agent-report-writer.mjs";
import { findSpecById } from "./spec-parser.mjs";
import {
  gradesRoot,
  findGradeFileForSlice,
  parseScoresFromBody,
  parseDecisionsFromBody,
  validateScores
} from "./grade-parser.mjs";
import { locateSliceFile, slicesRoot as resolveSlicesRoot, ensureDir } from "./paths.mjs";
import { buildArtifactSlug } from "./artifact-naming.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(scriptDir, "..", "..", "templates");

async function readTemplate(rel) {
  return fs.readFile(path.join(templateDir, rel), "utf8");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Build a UTC timestamp string in the crew artifact format: YYYYMMDDTHHMMSSz
function utcTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
}

// Build the full path for a new grade file using the artifact naming convention.
// Format: <gradesRoot>/<TS>-<slug>-grade.md
// where slug = [phaseN-][featNNN-]sliceNN (via buildArtifactSlug).
function newGradeFilePath(repoRoot, sliceId, { featureId, phase, config }: Record<string, unknown> = {}) {
  const slug = buildArtifactSlug({ featureId: featureId || null, phase: phase || null, sliceId });
  const filename = `${utcTimestamp()}-${slug}-grade.md`;
  return path.join(gradesRoot(repoRoot, config), filename);
}

async function findSliceFile(repoPath, sliceId, config) {
  const slicesRootDir = resolveSlicesRoot(repoPath, config);
  return locateSliceFile(slicesRootDir, sliceId);
}

// Resolves feature/spec/phase/target_release for the prefill block. Each
// field walks through whichever level (slice → feature → spec) carries it.
async function readSlicePrefillFields(sliceFile) {
  if (!sliceFile) return { featureId: null, phase: null, targetRelease: null };
  const content = await fs.readFile(sliceFile, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  return {
    featureId: frontmatter.feature || null,
    phase: frontmatter.phase || null,
    targetRelease: frontmatter.target_release || null
  };
}

async function readFeaturePrefill(repoPath, featureId, config) {
  if (!featureId) return { specId: null, targetRelease: null };
  const feat = await findFeatureById(repoPath, featureId, config);
  if (!feat) return { specId: null, targetRelease: null };
  const df = feat.frontmatter.derived_from;
  return {
    specId: (Array.isArray(df) ? df[0] : df) || null,
    targetRelease: feat.frontmatter.target_release || null
  };
}

async function resolveGradePrefill(repoPath, sliceId, config) {
  const sliceFile = await findSliceFile(repoPath, sliceId, config);
  const fromSlice = await readSlicePrefillFields(sliceFile);
  const fromFeature = await readFeaturePrefill(repoPath, fromSlice.featureId, config);
  let targetRelease = fromSlice.targetRelease || fromFeature.targetRelease || null;
  if (fromFeature.specId && !targetRelease) {
    const spec = await findSpecById(repoPath, fromFeature.specId, config);
    if (spec?.frontmatter?.target_release) targetRelease = spec.frontmatter.target_release;
  }
  return {
    featureId: fromSlice.featureId,
    specId: fromFeature.specId,
    phase: fromSlice.phase,
    targetRelease
  };
}

function applyInferredScores(tpl, inference) {
  let out = tpl;
  for (const [dim, value] of Object.entries(inference.scores as Record<string, any>)) {
    const fixed = value.toFixed(2);
    out = out.replace(new RegExp(`^(  ${dim}): 0$`, "m"), `$1: ${fixed}`);
    out = out.replace(new RegExp(`(- ${dim}): 0\\.00`), `$1: ${fixed}`);
  }
  if (Object.keys(inference.scores).length > 0) {
    const sourceLines = Object.entries(inference.sources as Record<string, any>)
      .map(([dim, srcs]) => `- ${dim}: ${srcs.join(", ")}`)
      .join("\n");
    out = out.replace(
      "(Update both the frontmatter `scores:` map and this list. The frontmatter\nis what plugin commands read; the list is for human review.)",
      `(Scores prefilled from crew artifacts where signals were available. Override any value if your honest assessment differs.)\n\n### Inference sources\n\n${sourceLines}`
    );
  }
  return out;
}

function patchGradeFrontmatter(tpl, { featureId, specId, phase, targetRelease }) {
  return tpl
    .replace(/GRADE-SLICE-NN/g, `GRADE-${tpl.match(/SLICE-\d+/)?.[0] || "SLICE-NN"}`)
    .replace(/^(spec):\s*null/m, `$1: ${specId || "null"}`)
    .replace(/^(phase):\s*null/m, `$1: ${phase ?? "null"}`)
    .replace(/^(target_release):\s*null/m, `$1: ${targetRelease || "null"}`)
    .replace(/^(feature):\s*FEAT-NNN/m, `$1: ${featureId || "null"}`);
}

export async function createGradeFile(repoPath, sliceId, { config = null }: Record<string, any> = {}) {
  if (!sliceId) throw new Error("createGradeFile requires sliceId");

  // Check for an existing grade file (legacy or new format) before creating.
  const existing = await findGradeFileForSlice(repoPath, sliceId, config);
  if (existing) {
    return { gradePath: existing, created: false };
  }
  await ensureDir(gradesRoot(repoPath, config));

  const prefill = await resolveGradePrefill(repoPath, sliceId, config);
  const { inferScoresForSlice } = await import("./score-inference.mjs");
  const inference = await inferScoresForSlice(repoPath, sliceId);

  // Build the new timestamped filename using the artifact naming convention.
  const target = newGradeFilePath(repoPath, sliceId, {
    featureId: prefill.featureId,
    phase: prefill.phase,
    config
  });

  let tpl = await readTemplate("grades/grade-template.md");
  tpl = tpl
    .replace(/GRADE-SLICE-NN/g, `GRADE-${sliceId}`)
    .replace(/SLICE-NN: <title>/g, `${sliceId}: <fill title>`)
    .replace(/\bSLICE-NN\b/g, sliceId)
    .replace(/FEAT-NNN/g, prefill.featureId || "null")
    .replace(/YYYY-MM-DD/g, today());
  tpl = applyInferredScores(tpl, inference);
  tpl = patchGradeFrontmatter(tpl, prefill);

  // Inject identification line after the H1 heading (first `# …` line in the body)
  const id = renderIdentification(prefill.phase, prefill.featureId, sliceId);
  if (id) {
    tpl = tpl.replace(/(^# .+$)/m, `$1\n\n${id}`);
  }

  await fs.writeFile(target, tpl);
  return {
    gradePath: target,
    created: true,
    prefilled: prefill
  };
}

// Write back the grade after agent edits: validate scores, extract DEC-TBD
// blocks into docs/decisions/, replace TBD ids in grade body with allocated
// ids, update frontmatter `decisions: [DEC-NNN, ...]`. Idempotent.
export async function writeGrade(repoPath, sliceId, { config = null }: Record<string, any> = {}) {
  // Locate the grade file regardless of format (new timestamped or legacy).
  const target = await findGradeFileForSlice(repoPath, sliceId, config);
  if (!target) {
    throw new Error(`Grade file not found for ${sliceId}`);
  }
  const content = await fs.readFile(target, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  const scores = parseScoresFromBody(body);
  const scoreErrors = validateScores(scores);
  if (scoreErrors.length > 0) {
    const err = new Error(`Score validation failed:\n  - ${scoreErrors.join("\n  - ")}`) as NodeJS.ErrnoException;
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

  const scoresAvg = averageOf(scores);
  if (scoresAvg !== null) {
    const { recordGradeScore } = await import("./grade-trend.mjs");
    await recordGradeScore(repoPath, { sliceId, avg: scoresAvg });
  }

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
  const allocated: any[] = [];
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
