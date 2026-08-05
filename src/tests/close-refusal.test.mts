// @ts-nocheck
// P1.4 — close-refusal: verdict-aware review/validation gates at slice close.
//
// Tier (a): a rejected review / failed validation holds FEAT→done promotion
//           via the existing soft-block architecture in completeSlice.
// Tier (b): the single-shot closeSlice --grade-yaml path throws
//           GATE_FAILED_AT_CLOSE (after a 3-violation warn-mode warm-up).
// forceClose: keeps working, but leaves a full audit trail (frontmatter +
//           slice_force_closed event). D1 resolved: keep + audit.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { closeSlice, sliceFromFeature, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature, updateFeatureFrontmatter } from "../scripts/lib/backlog-writer.mjs";
import { deriveReviewGate } from "../scripts/lib/review-gate.mjs";
import { deriveValidationGate } from "../scripts/lib/validation-gate.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { AC_SECTION_BODY, initGitRepo, isolateCrewCli } from "./_fixtures.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
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
  decision: string | null,
  extraFm = ""
) {
  const dir = path.join(repo, ".claude/artifacts/crew", kind);
  await fs.mkdir(dir, { recursive: true });
  const token = sliceId.toLowerCase();
  const ts = "20260704T120000Z";
  const fm = decision === null ? "" : `---\ndecision: ${decision}\n${extraFm}---\n`;
  const body = `# ${kind} for ${sliceId}\n\nDecision: ${decision ?? "prose only"}\n`;
  const file = path.join(dir, `${ts}-${kind.slice(0, -1)}-result-${token}-test.md`);
  await fs.writeFile(file, fm + body);
  return file;
}

function gradeYamlBody(sliceId: string, featureId: string): string {
  return [
    "---",
    `id: GRADE-${sliceId}`,
    `slice: ${sliceId}`,
    `feature: ${featureId}`,
    "spec: null",
    "phase: null",
    "target_release: null",
    "graded_at: 2026-07-04",
    "duration_hours: 0.5",
    "scores:",
    "  architecture_quality: 0.85",
    "  reliability: 0.85",
    "  observability: 0.85",
    "  production_readiness: 0.85",
    "  security: 0.85",
    "  test_confidence: 0.85",
    "  product_completeness: 0.85",
    "decisions: []",
    "---",
    `# ${sliceId}: Test — Grade`,
    "",
    "## Scores",
    "",
    "- architecture_quality: 0.85",
    "- reliability: 0.85",
    "- observability: 0.85",
    "- production_readiness: 0.85",
    "- security: 0.85",
    "- test_confidence: 0.85",
    "- product_completeness: 0.85",
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

// Pre-seed the warm-up counter past the warn window so tier-(b) tests hit the
// enforcing path deterministically.
async function exhaustWarmup(repo: string) {
  const statePath = path.join(repo, ".claude/state/loop/close-refusal-state.json");
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify({ gateEvaluatedCloses: 99 }));
}

// ---------------------------------------------------------------------------
// Gate derivation units
// ---------------------------------------------------------------------------

test("deriveReviewGate: rejected artifact decision is NOT satisfied", async () => {
  const repo = await tmpRepo("cr-review-rejected-");
  const { sliceId } = await setupSlice(repo);
  await writeArtifact(repo, "reviews", sliceId, "rejected");
  const gate = await deriveReviewGate(repo, sliceId);
  assert.equal(gate.satisfied, false);
  assert.match(gate.reason, /rejected/);
});

test("deriveReviewGate: approved and approved_with_notes satisfy", async () => {
  const repo = await tmpRepo("cr-review-ok-");
  const { sliceId } = await setupSlice(repo);
  await writeArtifact(repo, "reviews", sliceId, "approved_with_notes");
  const gate = await deriveReviewGate(repo, sliceId);
  assert.equal(gate.satisfied, true);
  assert.match(gate.reason, /approved_with_notes/);
});

// SLICE-202 / FEAT-283 defect 3: the grandfather clause was deleted outright
// (no date/marker cutoff) — a review artifact with no `decision` frontmatter
// key never proves a review happened, regardless of when it was written.
test("deriveReviewGate: artifact with no decision frontmatter is unproven, NOT satisfied", async () => {
  const repo = await tmpRepo("cr-review-nodecision-");
  const { sliceId } = await setupSlice(repo);
  await writeArtifact(repo, "reviews", sliceId, null);
  const gate = await deriveReviewGate(repo, sliceId);
  assert.equal(gate.satisfied, false);
  assert.equal(gate.legacy, undefined);
  assert.match(gate.reason, /no `decision` frontmatter key/);
});

// SLICE-181 / SLICE-182 shape specifically: no frontmatter block at all, only
// a prose "**Decision: PASS**" line in the body. Must resolve identically to
// the null-decision case above — the parser sees no frontmatter `decision`
// key either way.
test("deriveReviewGate: SLICE-181/182 shape (prose-only Decision line, no frontmatter) is unproven", async () => {
  const repo = await tmpRepo("cr-review-prose-only-");
  const { sliceId } = await setupSlice(repo);
  const dir = path.join(repo, ".claude/artifacts/crew/reviews");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `20260804T120000Z-review-result-${sliceId.toLowerCase()}-test.md`);
  await fs.writeFile(file, `# Review for ${sliceId}\n\n**Decision: PASS**\n\nLooks good.\n`);
  const gate = await deriveReviewGate(repo, sliceId);
  assert.equal(gate.satisfied, false);
  assert.match(gate.reason, /no `decision` frontmatter key/);
  assert.match(gate.reason, /add a `decision:` key/);
});

test("deriveReviewGate: requires_review false waiver satisfies", async () => {
  const repo = await tmpRepo("cr-review-waiver-");
  const { sliceId } = await setupSlice(repo);
  const gate = await deriveReviewGate(repo, sliceId, { sliceFm: { requires_review: false } });
  assert.equal(gate.satisfied, true);
  assert.match(gate.reason, /waiver/);
});

test("deriveValidationGate: decision fail is NOT satisfied (SLICE-174 fix)", async () => {
  const repo = await tmpRepo("cr-val-fail-");
  const { sliceId } = await setupSlice(repo);
  await writeArtifact(repo, "validations", sliceId, "fail");
  const gate = await deriveValidationGate(repo, sliceId);
  assert.equal(gate.satisfied, false);
  assert.match(gate.reason, /fail/);
});

test("deriveValidationGate: skipped with reason satisfies", async () => {
  const repo = await tmpRepo("cr-val-skip-");
  const { sliceId } = await setupSlice(repo);
  await writeArtifact(repo, "validations", sliceId, "skipped", 'skip_reason: "doc-only"\n');
  const gate = await deriveValidationGate(repo, sliceId);
  assert.equal(gate.satisfied, true);
  assert.match(gate.reason, /skipped: doc-only/);
});

// ---------------------------------------------------------------------------
// Tier (a): soft-block — FEAT→done held on rejected review
// ---------------------------------------------------------------------------

test("completeSlice: rejected review holds FEAT promotion (soft-block)", async () => {
  const repo = await tmpRepo("cr-tier-a-");
  const { sliceId } = await setupSlice(repo);
  await writeArtifact(repo, "reviews", sliceId, "rejected");
  await writeArtifact(repo, "validations", sliceId, "pass");
  const out = await completeSlice(repo, sliceId);
  assert.equal(out.feature.skipped, true, "FEAT must be held, not promoted");
  assert.match(out.feature.reason, /review-gate/);
  assert.match(out.feature.reason, /rejected/);
});

test("completeSlice: approved review + pass validation promotes normally", async () => {
  const repo = await tmpRepo("cr-tier-a-ok-");
  const { sliceId } = await setupSlice(repo);
  await writeArtifact(repo, "reviews", sliceId, "approved");
  await writeArtifact(repo, "validations", sliceId, "pass");
  const out = await completeSlice(repo, sliceId);
  assert.notEqual(out.feature.skipped, true, "clean gates must promote");
});

// ---------------------------------------------------------------------------
// Tier (b): hard throw on single-shot close (post warm-up)
// ---------------------------------------------------------------------------

test("closeSlice --grade-yaml throws GATE_FAILED_AT_CLOSE on rejected review (post warm-up)", async () => {
  const repo = await tmpRepo("cr-tier-b-");
  const { sliceId, featureId } = await setupSlice(repo);
  await exhaustWarmup(repo);
  await writeArtifact(repo, "reviews", sliceId, "rejected");
  await writeArtifact(repo, "validations", sliceId, "pass");
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId));
  await assert.rejects(
    () => closeSlice(repo, sliceId, { gradeYamlPath: yamlPath }),
    (err: any) => err.code === "GATE_FAILED_AT_CLOSE" && /rejected/.test(err.message)
  );
});

test("closeSlice warn-mode: first 3 gate violations warn instead of throwing", async () => {
  const repo = await tmpRepo("cr-warmup-");
  const { sliceId, featureId } = await setupSlice(repo);
  await writeArtifact(repo, "reviews", sliceId, "rejected");
  await writeArtifact(repo, "validations", sliceId, "pass");
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId));
  // Fresh repo → counter at 0 → warn-mode: must NOT throw.
  const out = await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath });
  assert.equal(out.scaffoldOnly, false, "warn-mode close must complete");
  const counter = JSON.parse(
    await fs.readFile(path.join(repo, ".claude/state/loop/close-refusal-state.json"), "utf8")
  );
  assert.equal(counter.gateEvaluatedCloses, 1, "violation must bump the persisted counter");
});

test("closeSlice with close-refusal flag off skips the pre-flight entirely", async () => {
  const repo = await tmpRepo("cr-flag-off-");
  const configPath = path.join(repo, ".claude/loop.json");
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  config.features = { "close-refusal": { enabled: false } };
  await fs.writeFile(configPath, JSON.stringify(config));
  const { sliceId, featureId } = await setupSlice(repo);
  await exhaustWarmup(repo);
  await writeArtifact(repo, "reviews", sliceId, "rejected");
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId));
  const out = await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath });
  assert.equal(out.scaffoldOnly, false, "flag off must preserve old behavior");
});

// ---------------------------------------------------------------------------
// forceClose: keep + audit (D1)
// ---------------------------------------------------------------------------

test("forceClose past rejected review closes with full audit trail", async () => {
  const repo = await tmpRepo("cr-force-");
  const { sliceId, featureId } = await setupSlice(repo);
  await exhaustWarmup(repo);
  await writeArtifact(repo, "reviews", sliceId, "rejected");
  await writeArtifact(repo, "validations", sliceId, "pass");
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId));

  const out = await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath, forceClose: true });
  assert.equal(out.scaffoldOnly, false, "forceClose must complete the close");

  // Audit 1: slice frontmatter carries force_closed + reasons (slice file has
  // moved to completed/ — find it there).
  const completedDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/completed");
  const files = await fs.readdir(completedDir);
  const idToken = sliceId.replace("-", "_");
  const sliceFile = files.find((f) => f.startsWith(idToken));
  assert.ok(sliceFile, "slice file must be in completed/");
  const { frontmatter } = parseFrontmatter(
    await fs.readFile(path.join(completedDir, sliceFile), "utf8")
  );
  assert.equal(frontmatter.force_closed, true);
  assert.ok(
    Array.isArray(frontmatter.force_closed_reason) &&
      frontmatter.force_closed_reason.some((r: string) => /review/.test(r)),
    "force_closed_reason must name the overridden review gate"
  );

  // Audit 2: slice_force_closed event on the slice event stream.
  const eventsFile = path.join(
    repo,
    ".claude/artifacts/loop/trajectories",
    `${sliceId}-events.jsonl`
  );
  const events = (await fs.readFile(eventsFile, "utf8"))
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  const forceEvent = events.find((e) => e.type === "slice_force_closed");
  assert.ok(forceEvent, "slice_force_closed event must be emitted");
  assert.ok(forceEvent.overriddenGates.some((g: string) => /review/.test(g)));
});
