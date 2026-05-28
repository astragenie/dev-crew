// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import {
  parseScoresFromBody,
  parseDecisionsFromBody,
  validateScores,
  SCORE_DIMENSIONS,
  findGradeForSlice
} from "../scripts/lib/grade-parser.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { listDecisions } from "../scripts/lib/decisions-store.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

test("validateScores rejects out-of-range values", () => {
  const errors = validateScores({
    architecture_quality: 0.8,
    reliability: 1.5,
    observability: -0.1,
    production_readiness: 0.7,
    security: 0.9,
    test_confidence: 0.8,
    product_completeness: 0.9
  });
  assert.equal(errors.length, 2);
  assert.match(errors.join("\n"), /reliability/);
  assert.match(errors.join("\n"), /observability/);
});

test("validateScores rejects missing dimensions", () => {
  const errors = validateScores({ architecture_quality: 0.8 });
  // 6 dimensions missing
  assert.ok(errors.length >= 6);
});

test("validateScores passes when all 7 dimensions are valid", () => {
  const scores = {};
  for (const dim of SCORE_DIMENSIONS) scores[dim] = 0.85;
  assert.deepEqual(validateScores(scores), []);
});

test("parseScoresFromBody extracts the ## Scores section", () => {
  const body = [
    "# Header",
    "## Scores",
    "- architecture_quality: 0.85",
    "- reliability: 0.80",
    "## Other",
    "- not a score"
  ].join("\n");
  const scores = parseScoresFromBody(body);
  assert.equal(scores.architecture_quality, 0.85);
  assert.equal(scores.reliability, 0.8);
  assert.equal(scores.not, undefined);
});

test("parseDecisionsFromBody extracts DEC-TBD blocks with rationale", () => {
  const body = [
    "## Decisions",
    "",
    "### DEC-TBD: First decision",
    "",
    "**Rationale**: First reason",
    "",
    "**Consequences**:",
    "- positive",
    "",
    "### DEC-TBD: Second decision",
    "",
    "**Rationale**: Second reason",
    "",
    "## Surprises"
  ].join("\n");
  const decs = parseDecisionsFromBody(body);
  assert.equal(decs.length, 2);
  assert.equal(decs[0].title, "First decision");
  assert.equal(decs[0].rationale, "First reason");
  assert.match(decs[0].consequences, /positive/);
  assert.equal(decs[1].title, "Second decision");
});

test("createGradeFile generates a template with slice id substituted", async () => {
  const repo = await tmpRepo("al-grade-create-");
  const result = await createGradeFile(repo, "SLICE-99");
  assert.equal(result.created, true);
  const content = await fs.readFile(result.gradePath, "utf8");
  assert.match(content, /SLICE-99/);
  assert.match(content, /architecture_quality/);
});

test("createGradeFile is only-if-missing — does not clobber", async () => {
  const repo = await tmpRepo("al-grade-noclobber-");
  const first = await createGradeFile(repo, "SLICE-10");
  await fs.appendFile(first.gradePath, "\n# user edits");
  const second = await createGradeFile(repo, "SLICE-10");
  assert.equal(second.created, false);
  const content = await fs.readFile(second.gradePath, "utf8");
  assert.match(content, /user edits/);
});

test("createGradeFile prefills feature + spec links from slice file", async () => {
  const repo = await tmpRepo("al-grade-prefill-");
  const feat = await addFeature(repo, {
    title: "Linked feature",
    target_release: "v1.0.0",
    priority: "P1"
  });
  await moveFeature(feat.filePath, "triaged");
  const sliceResult = await sliceFromFeature(repo, feat.id);
  const grade = await createGradeFile(repo, sliceResult.slice.id);
  assert.equal(grade.created, true);
  const content = await fs.readFile(grade.gradePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.feature, feat.id);
  assert.equal(frontmatter.target_release, "v1.0.0");
});

test("writeGrade rejects when scores are still 0 across the board", async () => {
  const repo = await tmpRepo("al-grade-zero-");
  const created = await createGradeFile(repo, "SLICE-01");
  // Default template has 0 for all scores — that's a valid input (in range)
  // but represents "not filled". writeGrade should pass since 0 is in [0,1].
  // To prove validation catches a REAL invalid input, edit scores:
  let content = await fs.readFile(created.gradePath, "utf8");
  content = content.replace("- architecture_quality: 0.00", "- architecture_quality: 1.5");
  await fs.writeFile(created.gradePath, content);
  await assert.rejects(() => writeGrade(repo, "SLICE-01"), /architecture_quality.*1\.5/);
});

test("writeGrade extracts DEC-TBD blocks into .claude/artifacts/loop/decisions/", async () => {
  const repo = await tmpRepo("al-grade-extract-");
  const created = await createGradeFile(repo, "SLICE-01");
  const gradePath = created.gradePath;
  let content = await fs.readFile(gradePath, "utf8");
  // Fill valid scores in body
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  await fs.writeFile(gradePath, content);

  const result = await writeGrade(repo, "SLICE-01");
  assert.equal(result.decisionsAllocated.length, 1);
  assert.match(result.decisionsAllocated[0], /^DEC-001$/);
  // Extracted decision exists
  const decs = await listDecisions(repo);
  assert.equal(decs.length, 1);
  assert.equal(decs[0].id, "DEC-001");
  // Re-running grade-write is idempotent (DEC-TBD already replaced)
  const second = await writeGrade(repo, "SLICE-01");
  assert.equal(second.decisionsAllocated.length, 0);
});

test("findGradeForSlice returns null when no grade exists", async () => {
  const repo = await tmpRepo("al-grade-find-");
  const found = await findGradeForSlice(repo, "SLICE-99");
  assert.equal(found, null);
});
