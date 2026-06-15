import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { findFeatureById } from "./backlog-writer.mjs";
import { renderIdentification } from "./slice-linker.mjs";
import { findSpecById } from "./spec-parser.mjs";
import {
  gradesRoot,
  findGradeFileForSlice,
  parseScoresFromBody,
  parseDecisionsFromBody,
  validateScores,
  isAllZeroScores,
  detectPlaceholders
} from "./grade-parser.mjs";
import { locateSliceFile, slicesRoot as resolveSlicesRoot, ensureDir } from "./paths.mjs";
import { buildArtifactSlug } from "./artifact-naming.mjs";
import { appendGradeEvent } from "./grade-jsonl-writer.mjs";
import { fanoutEnvelope } from "./webhook-fanout.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
// Support two execution layouts:
// 1. Emitted (scripts/ tree): scripts/lib/ → templates
// 2. Direct (src/ tree): src/scripts/lib/ → templates (fallback)
let templateDir = path.resolve(scriptDir, "..", "..", "templates");
if (!existsSync(templateDir)) {
  templateDir = path.resolve(scriptDir, "..", "..", "..", "templates");
}

async function readTemplate(rel: string) {
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
function newGradeFilePath(
  repoRoot: string,
  sliceId: string,
  {
    featureId,
    phase,
    config
  }: { featureId?: string | null; phase?: string | null; config?: Record<string, any> | null } = {}
) {
  const slug = buildArtifactSlug({ featureId: featureId || null, phase: phase || null, sliceId });
  const filename = `${utcTimestamp()}-${slug}-grade.md`;
  return path.join(gradesRoot(repoRoot, config), filename);
}

async function findSliceFile(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
) {
  const slicesRootDir = resolveSlicesRoot(repoPath, config);
  return locateSliceFile(slicesRootDir, sliceId);
}

// Resolves feature/spec/phase/target_release for the prefill block. Each
// field walks through whichever level (slice → feature → spec) carries it.
async function readSlicePrefillFields(sliceFile: string | null) {
  if (!sliceFile) return { featureId: null, phase: null, targetRelease: null };
  const content = await fs.readFile(sliceFile, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  return {
    featureId: frontmatter.feature || null,
    phase: frontmatter.phase || null,
    targetRelease: frontmatter.target_release || null
  };
}

async function readFeaturePrefill(
  repoPath: string,
  featureId: string | null,
  config: Record<string, any> | null
) {
  if (!featureId) return { specId: null, targetRelease: null };
  const feat = await findFeatureById(repoPath, featureId, config);
  if (!feat) return { specId: null, targetRelease: null };
  const df = feat.frontmatter.derived_from;
  return {
    specId: (Array.isArray(df) ? df[0] : df) || null,
    targetRelease: feat.frontmatter.target_release || null
  };
}

async function resolveGradePrefill(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
) {
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

function applyInferredScores(tpl: string, inference: Record<string, any>) {
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

function patchGradeFrontmatter(
  tpl: string,
  {
    featureId,
    specId,
    phase,
    targetRelease
  }: {
    featureId: string | null;
    specId: string | null;
    phase: string | null;
    targetRelease: string | null;
  }
) {
  return tpl
    .replace(/GRADE-SLICE-NN/g, `GRADE-${tpl.match(/SLICE-\d+/)?.[0] || "SLICE-NN"}`)
    .replace(/^(spec):\s*null/m, `$1: ${specId || "null"}`)
    .replace(/^(phase):\s*null/m, `$1: ${phase ?? "null"}`)
    .replace(/^(target_release):\s*null/m, `$1: ${targetRelease || "null"}`)
    .replace(/^(feature):\s*FEAT-NNN/m, `$1: ${featureId || "null"}`);
}

export async function createGradeFile(
  repoPath: string,
  sliceId: string,
  { config = null }: Record<string, any> = {}
) {
  if (!sliceId) throw new Error("createGradeFile requires sliceId");

  // Check for an existing grade file (legacy or new format) before creating.
  const existing = await findGradeFileForSlice(repoPath, sliceId, config);
  if (existing) {
    return { gradePath: existing, created: false };
  }
  await ensureDir(gradesRoot(repoPath, config));

  const { inferScoresForSlice } = await import("./score-inference.mjs");
  const [prefill, inference] = await Promise.all([
    resolveGradePrefill(repoPath, sliceId, config),
    inferScoresForSlice(repoPath, sliceId)
  ]);

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
export async function writeGrade(
  repoPath: string,
  sliceId: string,
  { config = null }: Record<string, any> = {}
) {
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
    const err = new Error(
      `Score validation failed:\n  - ${scoreErrors.join("\n  - ")}`
    ) as NodeJS.ErrnoException;
    err.code = "SCORE_VALIDATION";
    throw err;
  }

  // FEAT-145: Check for unfilled/template grades (all-zero scores or placeholder text)
  const allZeroErrors: string[] = [];
  if (isAllZeroScores(scores)) {
    allZeroErrors.push("All score dimensions are 0 (unfilled template)");
  }
  const placeholders = detectPlaceholders(body);
  if (placeholders.length > 0) {
    allZeroErrors.push(
      `Found ${placeholders.length} placeholder text pattern(s):\n  - ${placeholders.join("\n  - ")}`
    );
  }
  if (allZeroErrors.length > 0) {
    const err = new Error(
      `Grade template unfilled:\n  - ${allZeroErrors.join("\n  - ")}`
    ) as NodeJS.ErrnoException;
    err.code = "GRADE_TEMPLATE_UNFILLED";
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

  // Populate grade timing.* + shape.* telemetry fields (FEAT-184 / FEAT-186).
  const { computeTelemetry, applyTelemetry, applyShapeTelemetry } = await import(
    "./grade-telemetry.mjs"
  );
  const telemetry = await computeTelemetry(repoPath, sliceId, config);
  frontmatter.timing = applyTelemetry(
    (frontmatter.timing as Record<string, unknown>) ?? {},
    telemetry
  );
  frontmatter.shape = applyShapeTelemetry(
    (frontmatter.shape as Record<string, unknown>) ?? {},
    telemetry
  );

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

  // M1: mirror grade to grades.jsonl + fan out to runner via webhook.
  const gradeEvent = buildGradeEvent(sliceId, frontmatter, scores, allocated);
  await appendGradeEvent(repoPath, gradeEvent);
  await fanoutEnvelope(
    repoPath,
    "grade.recorded",
    gradeEvent as unknown as Record<string, unknown>
  );

  // L3-4: emit slice.agent_progress + agent.tool_call from each crew artifact
  // bundle that belongs to this slice. Fail-silent: any IO or parse error is
  // swallowed so the grade write contract is not affected.
  await emitNarrativeForSlice(repoPath, sliceId);

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

function averageOf(scores: Record<string, unknown>) {
  const vals = Object.values(scores).filter((v) => typeof v === "number") as number[];
  if (vals.length === 0) return null;
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3));
}

interface GradeEventOut {
  sliceId: string;
  featureId?: string;
  spec?: string;
  recordedAt: string;
  scores: Record<string, number>;
  decisions: Array<{ id: string; status: "accepted"; body: string }>;
  timing: Record<string, unknown>;
  shape: Record<string, unknown>;
}

function buildGradeEvent(
  sliceId: string,
  frontmatter: Record<string, any>,
  scores: Record<string, unknown>,
  allocated: Array<Record<string, any>>
): GradeEventOut {
  const featureId =
    typeof frontmatter.feature === "string" ? (frontmatter.feature as string) : undefined;
  const specId = typeof frontmatter.spec === "string" ? (frontmatter.spec as string) : undefined;
  const recordedAt =
    typeof frontmatter.graded_at === "string"
      ? (frontmatter.graded_at as string)
      : new Date().toISOString();
  const event: GradeEventOut = {
    sliceId,
    recordedAt,
    scores: scores as Record<string, number>,
    decisions: allocated.map((d) => ({
      id: d.id as string,
      status: "accepted" as const,
      body: (d.body as string | undefined) ?? ""
    })),
    timing: (frontmatter.timing as Record<string, unknown>) ?? {},
    shape: (frontmatter.shape as Record<string, unknown>) ?? {}
  };
  if (featureId) event.featureId = featureId;
  if (specId) event.spec = specId;
  return event;
}

// L3-4: walk the crew bundle tree and emit narrative envelopes for each
// bundle whose frontmatter `slice:` matches the slice id. Reads under
// `.claude/artifacts/crew/bundles/**/*.md`. Fail-silent.
async function emitNarrativeForSlice(repoPath: string, sliceId: string): Promise<void> {
  try {
    const { emitAgentNarrative } = await import("./agent-narrative-emitter.mjs");
    const bundlesRoot = path.join(repoPath, ".claude", "artifacts", "crew", "bundles");
    const candidates: string[] = [];
    let subdirs: string[] = [];
    try {
      subdirs = await fs.readdir(bundlesRoot);
    } catch {
      return;
    }
    for (const sub of subdirs) {
      const dir = path.join(bundlesRoot, sub);
      let stat;
      try {
        stat = await fs.stat(dir);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;
      let files: string[] = [];
      try {
        files = await fs.readdir(dir);
      } catch {
        continue;
      }
      for (const f of files) {
        if (f.endsWith(".md")) candidates.push(path.join(dir, f));
      }
    }

    for (const bundlePath of candidates) {
      let head = "";
      try {
        // Read the first ~2KB to find the slice: frontmatter line; bundles
        // can be MBs of diff/log content so don't load the whole file just
        // to filter.
        const fh = await fs.open(bundlePath, "r");
        try {
          const buf = Buffer.alloc(2048);
          const { bytesRead } = await fh.read(buf, 0, 2048, 0);
          head = buf.slice(0, bytesRead).toString("utf8");
        } finally {
          await fh.close();
        }
      } catch {
        continue;
      }
      const sliceMatch = /^slice:\s*([^\n]+)/m.exec(head);
      if (!sliceMatch || !sliceMatch[1]) continue;
      if (sliceMatch[1].trim() !== sliceId) continue;
      try {
        await emitAgentNarrative(repoPath, sliceId, bundlePath);
      } catch {
        // best-effort per bundle
      }
    }
  } catch {
    // best-effort overall
  }
}

async function extractDecisions(
  repoPath: string,
  sliceId: string,
  body: string,
  decisions: Record<string, any>[],
  config: Record<string, any> | null
) {
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
