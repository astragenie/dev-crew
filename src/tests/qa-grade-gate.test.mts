// @ts-nocheck
// FEAT-264 SLICE-5 (AC-5, #527) — test_confidence grade gate at slice close.
//
// Config-scoped extension of the existing GATE_FAILED_AT_CLOSE close-refusal
// machinery (close-refusal.test.mts covers the pre-existing review/validation
// gates): when `loop.qa_gate: "pre-build"`, a `--grade-yaml` whose
// `test_confidence` score is below TEST_CONFIDENCE_CLOSE_GATE_THRESHOLD
// (0.80) adds a `qa-grade-gate: ...` entry to the same failures array and
// fans out the new `qaGradeGate` halt-badge alongside the generic
// `gateFailedAtClose` one. `qa_gate: "off"` / absent (default "post-build")
// must NOT gate on this dimension at all — that equivalence is AC-5's own
// companion assertion, mirroring AC-2/AC-6 elsewhere in this FEAT.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { closeSlice, sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import {
  checkQaGradeGate,
  extractTestConfidenceFromGradeYaml
} from "../scripts/lib/slice-linker/close-slice.mjs";
import { addFeature, updateFeatureFrontmatter } from "../scripts/lib/backlog-writer.mjs";
import { AC_SECTION_BODY, initGitRepo, isolateCrewCli } from "./_fixtures.mjs";

type QaGateMode = "pre-build" | "post-build" | "off";

async function tmpRepo(prefix: string, qaGate?: QaGateMode): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  const loop: Record<string, any> = {
    aiLoopRoot: ".claude/artifacts/loop/ai-loop",
    backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
    slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
    phaseGateArtifactDir: ".claude/artifacts/crew/validations"
  };
  if (qaGate) loop.qa_gate = qaGate;
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ preset: "dotnet-python", loop, stack: {} })
  );
  await initGitRepo(repo);
  return repo;
}

isolateCrewCli();

async function setupSlice(repo: string): Promise<{ sliceId: string; featureId: string }> {
  const feat = await addFeature(repo, { title: "Test feature", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, { autonomous_safe: true });
  const result = await sliceFromFeature(repo, feat.id);
  const slicePath = result.slice.path;
  const content = await fs.readFile(slicePath, "utf8");
  await fs.writeFile(slicePath, content.replace(/- \[ \]/g, "- [x]"), "utf8");
  return { sliceId: result.slice.id, featureId: feat.id };
}

async function writeArtifact(
  repo: string,
  kind: "reviews" | "validations",
  sliceId: string,
  decision: string
) {
  const dir = path.join(repo, ".claude/artifacts/crew", kind);
  await fs.mkdir(dir, { recursive: true });
  const token = sliceId.toLowerCase();
  const ts = "20260718T120000Z";
  const fm = `---\ndecision: ${decision}\n---\n`;
  const body = `# ${kind} for ${sliceId}\n\nDecision: ${decision}\n`;
  const file = path.join(dir, `${ts}-${kind.slice(0, -1)}-result-${token}-test.md`);
  await fs.writeFile(file, fm + body);
  return file;
}

// Pre-seed the warm-up counter past the warn window so the blocking tests
// hit the enforcing path deterministically (mirrors close-refusal.test.mts).
async function exhaustWarmup(repo: string) {
  const statePath = path.join(repo, ".claude/state/loop/close-refusal-state.json");
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify({ gateEvaluatedCloses: 99 }));
}

// `testConfidence: null` omits the dimension entirely from BOTH the
// frontmatter `scores:` map and the body `## Scores` list, so callers that
// need a full downstream-valid close (writeGrade requires every
// SCORE_DIMENSIONS key) must NOT use null.
function gradeYamlBody(sliceId: string, featureId: string, testConfidence: number | null): string {
  const dims: Array<[string, number | null]> = [
    ["architecture_quality", 0.85],
    ["reliability", 0.85],
    ["observability", 0.85],
    ["production_readiness", 0.85],
    ["security", 0.85],
    ["test_confidence", testConfidence],
    ["product_completeness", 0.85]
  ];
  const present = dims.filter((d): d is [string, number] => d[1] !== null);

  return [
    "---",
    `id: GRADE-${sliceId}`,
    `slice: ${sliceId}`,
    `feature: ${featureId}`,
    "spec: null",
    "phase: null",
    "target_release: null",
    "graded_at: 2026-07-18",
    "duration_hours: 0.5",
    "scores:",
    ...present.map(([dim, v]) => `  ${dim}: ${v}`),
    "decisions: []",
    "---",
    `# ${sliceId}: Test — Grade`,
    "",
    "## Scores",
    "",
    ...present.map(([dim, v]) => `- ${dim}: ${v}`),
    "",
    "## Lessons",
    "",
    "- Test lesson",
    "",
    "## Surprises",
    "",
    "- Test surprise",
    "",
    "## Followups",
    "",
    "- Test followup",
    "",
    "## What went well",
    "",
    "n.",
    "",
    "## What went wrong",
    "",
    "n.",
    "",
    "## What I would do differently next time",
    "",
    "n.",
    ""
  ].join("\n");
}

async function baselineCleanGates(repo: string, sliceId: string): Promise<void> {
  await writeArtifact(repo, "reviews", sliceId, "approved");
  await writeArtifact(repo, "validations", sliceId, "pass");
}

// ---------------------------------------------------------------------------
// AC-5 evidence: blocking path, config-scoped to qa_gate: "pre-build"
// ---------------------------------------------------------------------------

test("closeSlice --grade-yaml blocks close when test_confidence < 0.80 under qa_gate: pre-build", async () => {
  const repo = await tmpRepo("qgg-block-", "pre-build");
  const { sliceId, featureId } = await setupSlice(repo);
  await exhaustWarmup(repo);
  await baselineCleanGates(repo, sliceId);
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId, 0.75));

  await assert.rejects(
    () => closeSlice(repo, sliceId, { gradeYamlPath: yamlPath }),
    (err: any) =>
      err.code === "GATE_FAILED_AT_CLOSE" &&
      /qa-grade-gate/.test(err.message) &&
      /test_confidence 0\.75/.test(err.message) &&
      Array.isArray(err.gateFailures) &&
      err.gateFailures.some((f: string) => /qa-grade-gate/.test(f))
  );
});

// ---------------------------------------------------------------------------
// AC-5 evidence: SAME fixture, config-gated off — must NOT block
// ---------------------------------------------------------------------------

test("closeSlice --grade-yaml with test_confidence 0.75 does NOT block when qa_gate is off", async () => {
  const repo = await tmpRepo("qgg-off-", "off");
  const { sliceId, featureId } = await setupSlice(repo);
  await exhaustWarmup(repo);
  await baselineCleanGates(repo, sliceId);
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId, 0.75));

  const out = await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath });
  assert.equal(out.scaffoldOnly, false, "qa_gate: off must not block close");
});

test("closeSlice --grade-yaml with test_confidence 0.75 does NOT block when qa_gate is absent", async () => {
  const repo = await tmpRepo("qgg-absent-");
  const { sliceId, featureId } = await setupSlice(repo);
  await exhaustWarmup(repo);
  await baselineCleanGates(repo, sliceId);
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId, 0.75));

  const out = await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath });
  assert.equal(out.scaffoldOnly, false, "absent qa_gate (default post-build) must not block close");
});

// ---------------------------------------------------------------------------
// AC-5 edge: test_confidence at/above threshold under pre-build — not blocked
// ---------------------------------------------------------------------------

test("closeSlice --grade-yaml with test_confidence 0.85 does NOT block under qa_gate: pre-build", async () => {
  const repo = await tmpRepo("qgg-pass-", "pre-build");
  const { sliceId, featureId } = await setupSlice(repo);
  await exhaustWarmup(repo);
  await baselineCleanGates(repo, sliceId);
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId, 0.85));

  const out = await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath });
  assert.equal(out.scaffoldOnly, false, "test_confidence >= 0.80 must not block close");
});

// ---------------------------------------------------------------------------
// AC-5 decide-and-document: missing test_confidence key is NOT a failure
// (absent != failing). Unit-level: a grade yaml missing the dimension
// entirely also fails writeGrade's independent SCORE_VALIDATION (all 7
// dimensions required) for unrelated reasons, so this is pinned directly
// against checkQaGradeGate rather than the full closeSlice ceremony.
// ---------------------------------------------------------------------------

test("checkQaGradeGate: missing test_confidence key does not block (absent is not failing)", async () => {
  const repo = await tmpRepo("qgg-missing-", "pre-build");
  const { sliceId, featureId } = await setupSlice(repo);
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId, null));

  const config = JSON.parse(await fs.readFile(path.join(repo, ".claude/loop.json"), "utf8"));
  const result = await checkQaGradeGate(yamlPath, config);
  assert.equal(result, null, "missing test_confidence must not produce a gate failure");
});

test("extractTestConfidenceFromGradeYaml: returns null when the dimension is absent from both shapes", () => {
  const content = gradeYamlBody("SLICE-999", "FEAT-999", null);
  assert.equal(extractTestConfidenceFromGradeYaml(content), null);
});

test("extractTestConfidenceFromGradeYaml: reads the score from a populated body", () => {
  const content = gradeYamlBody("SLICE-999", "FEAT-999", 0.72);
  assert.equal(extractTestConfidenceFromGradeYaml(content), 0.72);
});

test("checkQaGradeGate: returns null immediately when qa_gate is not pre-build, without touching the file", async () => {
  const result = await checkQaGradeGate("C:/does/not/exist.yaml", { loop: { qa_gate: "off" } });
  assert.equal(result, null);
});
