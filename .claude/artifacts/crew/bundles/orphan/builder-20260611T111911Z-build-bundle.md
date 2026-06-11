---
slice: unknown
builder: builder
run_id: 20260611T111911Z
feat: FEAT-184
files_touched: ["src/scripts/lib/grade-telemetry.mts", "src/scripts/lib/grade-writer.mts", "src/tests/grade-writer-telemetry.test.mts"]
files_read: []
diff_stat: { files: 1, additions: 1, deletions: 0 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-92 builder complete

- Created: 2026-06-11T11:19:11.798Z
- From: builder
- To: lead
- Objective: Telemetry writer implemented; 5 unit tests pass; full suite 1285 pass 0 fail
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - src/scripts/lib/grade-telemetry.mts
  - src/scripts/lib/grade-writer.mts
  - src/tests/grade-writer-telemetry.test.mts
- Confidence: high
- Risks: applyTelemetry treats false as overwriteable seed (template seeds boolean timing fields as false not null) — documented in code
- Suggested Next Handoff: review ladder + validator


## Diff

```diff
diff --git a/.claude/artifacts/loop/auto-dispatch.jsonl b/.claude/artifacts/loop/auto-dispatch.jsonl
index c6667ce..3bc9b47 100644
--- a/.claude/artifacts/loop/auto-dispatch.jsonl
+++ b/.claude/artifacts/loop/auto-dispatch.jsonl
@@ -108,3 +108,4 @@
 {"timestamp":"2026-06-10T20:29:25.159Z","agent":"loop:document-writer","parentCommand":"slice-complete","ok":true,"skipped":true,"skipReason":"cli-refusal-cli-doc-writer-disabled","durationMs":0}
 {"timestamp":"2026-06-10T23:28:07.706Z","agent":"loop:document-writer","parentCommand":"slice-complete","ok":true,"skipped":true,"skipReason":"cli-refusal-cli-doc-writer-disabled","durationMs":0}
 {"timestamp":"2026-06-11T09:01:47.343Z","agent":"loop:document-writer","parentCommand":"slice-complete","ok":true,"skipped":true,"skipReason":"cli-refusal-cli-doc-writer-disabled","durationMs":0}
+{"timestamp":"2026-06-11T11:05:08.558Z","agent":"loop:architect","parentCommand":"slice from-feature","costUsd":null,"durationMs":0,"ok":true,"skipped":false,"skipReason":null,"stepType":"dispatch","inputTokens":null,"outputTokens":null}

```

## Files touched

### src/scripts/lib/grade-telemetry.mts

```
import fs from "node:fs/promises";
import path from "node:path";

import { detectSerialReviewer } from "./reviewer-timing.mjs";

// Telemetry helpers for grade frontmatter timing.* fields (FEAT-184 / SLICE-92).
//
// All reads are best-effort: missing files or malformed data produce null
// rather than throwing. Callers (grade-writer) should treat null as "not
// measured yet" and leave the frontmatter field as-is (null placeholder from
// SLICE-91).

// --------------------------------------------------------------------------
// Wall-clock seconds: time from "slice start" log event to now.
// --------------------------------------------------------------------------

export async function computeWallClockSeconds(
  repoPath: string,
  sliceId: string
): Promise<number | null> {
  const logPath = path.join(repoPath, ".claude", "logs", "loop.jsonl");
  let content: string;
  try {
    content = await fs.readFile(logPath, "utf8");
  } catch {
    return null;
  }
  const lines = content.split("\n").filter((l) => l.trim());
  let lastStartTs: number | null = null;
  for (const line of lines) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.command === "slice start" && event.slice === sliceId) {
      const ts = typeof event.timestamp === "string" ? Date.parse(event.timestamp) : NaN;
      if (!Number.isNaN(ts)) lastStartTs = ts;
    }
  }
  if (lastStartTs === null) return null;
  return (Date.now() - lastStartTs) / 1000;
}

// --------------------------------------------------------------------------
// Phase-gate parallel: was the phase gate run in parallel mode?
// --------------------------------------------------------------------------

export async function readPhaseGateParallel(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
): Promise<boolean | null> {
  const artifactDir = path.resolve(
    repoPath,
    config?.loop?.phaseGateArtifactDir ?? ".claude/artifacts/crew/validations"
  );
  // Derive filename slug from sliceId using the same transform as phase-gate.mts
  const slug = sliceId.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const filename = `phase${slug}-gate.md`;
  const target = path.join(artifactDir, filename);
  let first: string;
  try {
    const raw = await fs.readFile(target, "utf8");
    first = raw.split("\n")[0]?.trim() ?? "";
  } catch {
    return null;
  }
  if (first.startsWith("# Phase Gate Report (parallel)")) return true;
  if (first.startsWith("# Phase Gate Report")) return false;
  return null;
}

// --------------------------------------------------------------------------
// Reviewer span: wraps detectSerialReviewer.
// --------------------------------------------------------------------------

export type ReviewerSpanResult = {
  spanMs: number;
  serial: boolean;
};

export async function computeReviewerSpan(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
): Promise<ReviewerSpanResult> {
  const thresholdMs = config?.reviewers?.serialTimingThresholdMs ?? 90000;
  const result = await detectSerialReviewer(repoPath, sliceId, { thresholdMs });
  return { spanMs: result.spanMs, serial: result.serial };
}

// --------------------------------------------------------------------------
// Telemetry aggregate.
// --------------------------------------------------------------------------

export type GradeTelemetry = {
  wall_clock_seconds: number | null;
  phase_gate_parallel: boolean | null;
  reviewer_span_ms: number | null;
  serial_reviewer_warning: boolean | null;
};

export async function computeTelemetry(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
): Promise<GradeTelemetry> {
  const [wallClock, phaseGateParallel, reviewerSpan] = await Promise.all([
    computeWallClockSeconds(repoPath, sliceId),
    readPhaseGateParallel(repoPath, sliceId, config),
    computeReviewerSpan(repoPath, sliceId, config)
  ]);
  return {
    wall_clock_seconds: wallClock,
    phase_gate_parallel: phaseGateParallel,
    reviewer_span_ms: reviewerSpan.spanMs > 0 ? reviewerSpan.spanMs : null,
    serial_reviewer_warning: reviewerSpan.spanMs > 0 ? reviewerSpan.serial : null
  };
}

// --------------------------------------------------------------------------
// Apply telemetry into frontmatter.timing map (idempotent).
// Only overwrites null / missing fields — never clobbers an existing value.
// --------------------------------------------------------------------------

export function applyTelemetry(
  timing: Record<string, unknown>,
  telemetry: GradeTelemetry
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...timing };
  for (const [key, value] of Object.entries(telemetry)) {
    if (value !== null && value !== undefined) {
      // Only write when current value is unset (null, undefined) or is the
      // boolean template seed (false). The grade template seeds boolean timing
      // fields as `false` — not `null` — as a YAML placeholder. We treat that
      // seed as "not yet measured" and overwrite it once. A populated numeric
      // value or an already-computed `true` is never clobbered (idempotency).
      const current = out[key];
      const isUnset = current === null || current === undefined || current === false;
      if (isUnset) {
        out[key] = value;
      }
    }
  }
  return out;
}

```

### src/scripts/lib/grade-writer.mts

```
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

  // Populate grade timing.* telemetry fields (FEAT-184).
  const { computeTelemetry, applyTelemetry } = await import("./grade-telemetry.mjs");
  const telemetry = await computeTelemetry(repoPath, sliceId, config);
  frontmatter.timing = applyTelemetry(
    (frontmatter.timing as Record<string, unknown>) ?? {},
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

```

### src/tests/grade-writer-telemetry.test.mts

```
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
// @ts-ignore — grade-parser import for SCORE_DIMENSIONS
import { SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "typescript-plugin-dev",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        gradesRoot: ".claude/artifacts/loop/grades",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

async function scaffoldSlice(repo: string, sliceId: string) {
  await fs.mkdir(path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress"), {
    recursive: true
  });
  const slug = sliceId.replace(/[^A-Za-z0-9]/g, "_");
  await fs.writeFile(
    path.join(repo, `.claude/artifacts/loop/ai-loop/slices/in-progress/${slug}.md`),
    `---\nid: ${sliceId}\nfeature: FEAT-184\n---\n# ${sliceId}\n`
  );
}

/** Fill grade template with real scores + clean up placeholders so writeGrade won't reject. */
async function fillGrade(gradePath: string) {
  let content = await fs.readFile(gradePath, "utf8");
  for (const dim of SCORE_DIMENSIONS as string[]) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(gradePath, content);
}

// ---------------------------------------------------------------------------
// AC-2a — wall_clock_seconds
// ---------------------------------------------------------------------------

test("AC-2a: wall_clock_seconds is populated from loop.jsonl slice-start event", async () => {
  const repo = await tmpRepo("grade-telemetry-wall-");
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);

    // Write a slice-start event timestamped 30 seconds ago.
    const startTs = new Date(Date.now() - 30_000).toISOString();
    await fs.mkdir(path.join(repo, ".claude/logs"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude/logs/loop.jsonl"),
      JSON.stringify({ timestamp: startTs, command: "slice start", slice: sliceId }) + "\n"
    );

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const raw = await fs.readFile(gradePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    const timing = frontmatter.timing as Record<string, unknown>;

    assert.ok(typeof timing.wall_clock_seconds === "number", "wall_clock_seconds must be a number");
    assert.ok(
      (timing.wall_clock_seconds as number) > 25,
      `wall_clock_seconds (${timing.wall_clock_seconds}) should be > 25`
    );
    assert.ok(
      (timing.wall_clock_seconds as number) < 60,
      `wall_clock_seconds (${timing.wall_clock_seconds}) should be < 60`
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-2b — phase_gate_parallel (true + null cases)
// ---------------------------------------------------------------------------

test("AC-2b: phase_gate_parallel is true when gate file has parallel header", async () => {
  const repo = await tmpRepo("grade-telemetry-pgp-true-");
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);

    // Write a phase-gate file with the parallel header.
    const validationsDir = path.join(repo, ".claude/artifacts/crew/validations");
    await fs.mkdir(validationsDir, { recursive: true });
    // Slug: "slice92" (same transform as phase-gate.mts)
    await fs.writeFile(
      path.join(validationsDir, "phaseslice92-gate.md"),
      "# Phase Gate Report (parallel) — phase slice92 — 2026-06-11T00:00:00Z\n"
    );

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const raw = await fs.readFile(gradePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    const timing = frontmatter.timing as Record<string, unknown>;
    assert.strictEqual(timing.phase_gate_parallel, true);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("AC-2b: phase_gate_parallel is null when gate file is absent", async () => {
  const repo = await tmpRepo("grade-telemetry-pgp-null-");
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);
    // No phase-gate file written.
    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const raw = await fs.readFile(gradePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    const timing = frontmatter.timing as Record<string, unknown>;
    // null means the file was absent — the placeholder seed from SLICE-91 is preserved.
    assert.strictEqual(timing.phase_gate_parallel, null);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-2c — reviewer_span_ms + serial_reviewer_warning
// ---------------------------------------------------------------------------

test("AC-2c: reviewer_span_ms and serial_reviewer_warning are set from review artifacts", async () => {
  const repo = await tmpRepo("grade-telemetry-review-span-");
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);

    // Write two review artifact filenames 120 s apart.
    // detectSerialReviewer uses the hyphen-anchored pattern `-slice-92-` .
    const reviewsDir = path.join(repo, ".claude/artifacts/crew/reviews");
    await fs.mkdir(reviewsDir, { recursive: true });
    const t1 = "20260611T000000Z";
    const t2 = "20260611T000200Z"; // 120 seconds later
    await fs.writeFile(path.join(reviewsDir, `${t1}-review-slice-92-a.md`), "reviewer A\n");
    await fs.writeFile(path.join(reviewsDir, `${t2}-review-slice-92-b.md`), "reviewer B\n");

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const raw = await fs.readFile(gradePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    const timing = frontmatter.timing as Record<string, unknown>;

    assert.ok(typeof timing.reviewer_span_ms === "number", "reviewer_span_ms must be a number");
    // Allow ±5 s tolerance around 120 000 ms
    assert.ok(
      (timing.reviewer_span_ms as number) >= 115_000 &&
        (timing.reviewer_span_ms as number) <= 125_000,
      `reviewer_span_ms (${timing.reviewer_span_ms}) should be ~120000`
    );
    assert.strictEqual(
      timing.serial_reviewer_warning,
      true,
      "serial_reviewer_warning must be true (span > 90s threshold)"
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-4 — idempotency: second writeGrade call must not clobber first values
// ---------------------------------------------------------------------------

test("AC-4: writeGrade is idempotent — timing fields are not clobbered on second call", async () => {
  const repo = await tmpRepo("grade-telemetry-idempotent-");
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);

    // Seed a slice-start event so wall_clock_seconds gets populated.
    const startTs = new Date(Date.now() - 30_000).toISOString();
    await fs.mkdir(path.join(repo, ".claude/logs"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude/logs/loop.jsonl"),
      JSON.stringify({ timestamp: startTs, command: "slice start", slice: sliceId }) + "\n"
    );

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);

    // First write
    await writeGrade(repo, sliceId);
    const raw1 = await fs.readFile(gradePath, "utf8");
    const { frontmatter: fm1 } = parseFrontmatter(raw1);

    // Second write (all timing fields now populated — must not change)
    await writeGrade(repo, sliceId);
    const raw2 = await fs.readFile(gradePath, "utf8");
    const { frontmatter: fm2 } = parseFrontmatter(raw2);

    const t1 = fm1.timing as Record<string, unknown>;
    const t2 = fm2.timing as Record<string, unknown>;

    // wall_clock_seconds must be identical between the two calls.
    assert.strictEqual(
      t1.wall_clock_seconds,
      t2.wall_clock_seconds,
      "wall_clock_seconds must not be clobbered on second call"
    );
    // All other timing fields must match.
    assert.deepStrictEqual(t1, t2, "timing map must be identical between two writeGrade calls");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

```

## Files read

