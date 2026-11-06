// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import {
  parseScoresFromBody,
  parseDecisionsFromBody,
  validateScores,
  SCORE_DIMENSIONS,
  findGradeForSlice
} from "../scripts/lib/grade-parser.mjs";
import { normalizeGradeYaml } from "../scripts/lib/grade-yaml-normalizer.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { listDecisions } from "../scripts/lib/decisions-store.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { AC_SECTION_BODY } from "./_fixtures.mjs";
import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";

async function tmpRepo(prefix) {
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
    priority: "P1",
    body: AC_SECTION_BODY
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

test("writeGrade rejects when all scores are 0 (all-zero block)", async () => {
  const repo = await tmpRepo("al-grade-all-zero-");
  await createGradeFile(repo, "SLICE-01");
  // Default template has all scores as 0 — this is an unfilled template.
  // writeGrade should reject with GRADE_TEMPLATE_UNFILLED error.
  await assert.rejects(
    () => writeGrade(repo, "SLICE-01"),
    (err) => err.code === "GRADE_TEMPLATE_UNFILLED"
  );
});

// FEAT-258: a grade with SOME (not all) dimensions at a genuine 0 is a valid
// grade — only an all-zero block indicates an unfilled template.
test("writeGrade accepts a grade with some (not all) zero scores", async () => {
  const repo = await tmpRepo("al-grade-partial-zero-");
  const created = await createGradeFile(repo, "SLICE-06");
  let content = await fs.readFile(created.gradePath, "utf8");
  // Fill all scores to real values, then re-zero exactly one dimension —
  // a legitimate 0 score on a single dimension, not an unfilled stub.
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  content = content.replace(`- ${SCORE_DIMENSIONS[0]}: 0.85`, `- ${SCORE_DIMENSIONS[0]}: 0`);
  // Replace placeholder lessons/decisions/surprises/followups.
  content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
  // FEAT-025: clear the H1 title scaffold token — writeGrade now rejects any
  // unreplaced `<fill ...>` token (grade-parser.mts GRADE_PLACEHOLDER_PATTERNS).
  content = content.replace("<fill title>", "Real Title");
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(created.gradePath, content);
  const result = await writeGrade(repo, "SLICE-06");
  assert.equal(result.sliceId, "SLICE-06");
});

// FEAT-258: the `--grade-yaml` normalizer path (grade-yaml-normalizer.mts)
// renders a missing `scores:` frontmatter map as an explicit all-zero
// `## Scores` list (one line per dimension, defaulted to 0) — this is exactly
// the silent-stub scenario the FEAT was filed against, so it MUST hit the
// same GRADE_TEMPLATE_UNFILLED rejection as a hand-authored all-zero grade.
test("writeGrade rejects a normalizeGradeYaml grade with an entirely missing scores map", async () => {
  const repo = await tmpRepo("al-grade-normalizer-missing-scores-");
  const created = await createGradeFile(repo, "SLICE-07");
  const yamlOnly = [
    "---",
    "id: GRADE-SLICE-07",
    "slice: SLICE-07",
    "feature: FEAT-258",
    "---",
    ""
  ].join("\n");
  await fs.writeFile(created.gradePath, normalizeGradeYaml(yamlOnly));
  await assert.rejects(
    () => writeGrade(repo, "SLICE-07"),
    (err) => err.code === "GRADE_TEMPLATE_UNFILLED"
  );
});

test("writeGrade rejects grades with placeholder bullets like 'bullet 1'", async () => {
  const repo = await tmpRepo("al-grade-placeholder-bullets-");
  const created = await createGradeFile(repo, "SLICE-02");
  let content = await fs.readFile(created.gradePath, "utf8");
  // Fill all scores to real values to isolate the placeholder test
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  // Keep "bullet 1" and "bullet 2" which are placeholders
  await fs.writeFile(created.gradePath, content);
  await assert.rejects(
    () => writeGrade(repo, "SLICE-02"),
    (err) => err.code === "GRADE_TEMPLATE_UNFILLED"
  );
});

test("writeGrade rejects grades with DEC-TBD placeholder title", async () => {
  const repo = await tmpRepo("al-grade-placeholder-dec-");
  const created = await createGradeFile(repo, "SLICE-03");
  let content = await fs.readFile(created.gradePath, "utf8");
  // Fill all scores to real values
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  // Fill lessons to remove "bullet 1" placeholder
  content = content.replace(/- bullet 1\n- bullet 2/, "- Lesson A\n- Lesson B");
  // Keep "### DEC-TBD: Short decision title" which is a placeholder
  await fs.writeFile(created.gradePath, content);
  await assert.rejects(
    () => writeGrade(repo, "SLICE-03"),
    (err) => err.code === "GRADE_TEMPLATE_UNFILLED"
  );
});

test("writeGrade accepts genuinely filled grades with real scores and content", async () => {
  const repo = await tmpRepo("al-grade-filled-");
  const created = await createGradeFile(repo, "SLICE-04");
  let content = await fs.readFile(created.gradePath, "utf8");
  // Fill all scores to real values
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  // Replace placeholder lessons
  content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
  // FEAT-025: clear the H1 title scaffold token — writeGrade now rejects any
  // unreplaced `<fill ...>` token (grade-parser.mts GRADE_PLACEHOLDER_PATTERNS).
  content = content.replace("<fill title>", "Real Title");
  // Remove the placeholder DEC-TBD section entirely
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  // Replace placeholder Surprises and Followups
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(created.gradePath, content);
  // This should NOT throw
  const result = await writeGrade(repo, "SLICE-04");
  assert.equal(result.sliceId, "SLICE-04");
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
  // Replace placeholder bullet lessons with real ones
  content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
  // FEAT-025: clear the H1 title scaffold token — writeGrade now rejects any
  // unreplaced `<fill ...>` token (grade-parser.mts GRADE_PLACEHOLDER_PATTERNS).
  content = content.replace("<fill title>", "Real Title");
  // Replace placeholder DEC-TBD title with a real title (but keep DEC-TBD id for extraction)
  content = content.replace(
    /### DEC-TBD: Short decision title/,
    "### DEC-TBD: Real architectural decision made"
  );
  // Replace placeholder Surprises and Followups
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
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

// FEAT-247 / A2 (SLICE-147): buildGradeEvent dual-emits canonical `ts`
// alongside the legacy `recordedAt` field for one release cycle. Verified
// by reading back the JSONL row written by appendGradeEvent (grades.jsonl),
// since buildGradeEvent itself is not exported.
test("writeGrade emits a grade event with ts equal to recordedAt (dual-emit)", async () => {
  const repo = await tmpRepo("al-grade-ts-dualemit-");
  const created = await createGradeFile(repo, "SLICE-05");
  let content = await fs.readFile(created.gradePath, "utf8");
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
  // FEAT-025: clear the H1 title scaffold token — writeGrade now rejects any
  // unreplaced `<fill ...>` token (grade-parser.mts GRADE_PLACEHOLDER_PATTERNS).
  content = content.replace("<fill title>", "Real Title");
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(created.gradePath, content);

  await writeGrade(repo, "SLICE-05");

  const jsonlPath = path.join(repo, ".claude", "artifacts", "loop", "grades.jsonl");
  const raw = await fs.readFile(jsonlPath, "utf8");
  const lines = raw.trim().split("\n").filter(Boolean);
  const event = JSON.parse(lines[lines.length - 1]);
  assert.ok(typeof event.recordedAt === "string" && event.recordedAt.length > 0);
  assert.ok(typeof event.ts === "string" && event.ts.length > 0);
  assert.equal(event.ts, event.recordedAt);
});

test("findGradeForSlice returns null when no grade exists", async () => {
  const repo = await tmpRepo("al-grade-find-");
  const found = await findGradeForSlice(repo, "SLICE-99");
  assert.equal(found, null);
});

// FEAT-180 (issue #247): readGrade (via findGradeForSlice) tolerantly reads
// the new optional not_checked/author_id/judge_id/self_approval fields.
// Historical grade artifacts predate all four fields entirely — this must
// degrade to safe defaults, never throw, never leave `undefined` for a
// downstream consumer to explode on.
test("findGradeForSlice defaults notChecked/authorId/judgeId/selfApproval when absent from frontmatter (historical artifact shape)", async () => {
  const repo = await tmpRepo("al-grade-notchecked-absent-");
  await createGradeFile(repo, "SLICE-01");
  // Grade file is created with none of the new fields (matches every
  // pre-FEAT-180 artifact on disk).
  const grade = await findGradeForSlice(repo, "SLICE-01");
  assert.deepEqual(grade.notChecked, []);
  assert.equal(grade.authorId, null);
  assert.equal(grade.judgeId, null);
  assert.equal(grade.selfApproval, null);
});

test("findGradeForSlice surfaces notChecked/authorId/judgeId/selfApproval when present in frontmatter", async () => {
  const repo = await tmpRepo("al-grade-notchecked-present-");
  const { gradePath } = await createGradeFile(repo, "SLICE-01");
  let content = await fs.readFile(gradePath, "utf8");
  content = content.replace(
    /^decisions: \[\]\n/m,
    "decisions: []\nnot_checked:\n  - performance benchmarks\n  - concurrent branch interactions\nauthor_id: builder-42\njudge_id: reviewer-7\nself_approval: false\n"
  );
  await fs.writeFile(gradePath, content);
  const grade = await findGradeForSlice(repo, "SLICE-01");
  assert.deepEqual(grade.notChecked, ["performance benchmarks", "concurrent branch interactions"]);
  assert.equal(grade.authorId, "builder-42");
  assert.equal(grade.judgeId, "reviewer-7");
  assert.equal(grade.selfApproval, false);
});

// FEAT-217: the extractDecisions call site mirrors each new decision into
// astramem when memory is enabled. A fake WireProvider is injected via
// @astragenie/astramem-client's _setWireProvider test seam (FEAT-235 — the
// CLI-spawn fallback this test used to exercise was retired) so no real
// astramem process is ever run.
test("writeGrade mirrors an extracted decision into astramem when memory enabled", async () => {
  _setWireProvider(null);
  _resetResolveCache();
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "al-grade-mem-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
      productName: "runner",
      memory: { enabled: "on" },
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );

  const calls = [];
  _setWireProvider({
    remember: async (req) => {
      calls.push(req);
    },
    recall: async () => ({ hits: [] }),
    health: async () => ({ ok: true })
  });

  try {
    const created = await createGradeFile(repo, "SLICE-01");
    let content = await fs.readFile(created.gradePath, "utf8");
    for (const dim of SCORE_DIMENSIONS) {
      content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
    }
    content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
    content = content.replace("<fill title>", "Real Title");
    // FEAT-025: clear the H1 title scaffold token — writeGrade now rejects any
    // unreplaced `<fill ...>` token (grade-parser.mts GRADE_PLACEHOLDER_PATTERNS).
    content = content.replace("<fill title>", "Real Title");
    content = content.replace(
      /### DEC-TBD: Short decision title/,
      "### DEC-TBD: Mirrored architectural decision"
    );
    content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
    content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
    await fs.writeFile(created.gradePath, content);

    const result = await writeGrade(repo, "SLICE-01");
    assert.equal(result.decisionsAllocated.length, 1);

    const rememberCalls = calls.filter((c) => c.type === "decision");
    assert.ok(rememberCalls.length >= 1, "expected a remember call for the decision");
    const call = rememberCalls[0];
    assert.equal(call.metadata?.project, "runner");
    assert.match(call.text, /DEC-001/);
    assert.match(call.text, /Mirrored architectural decision/);
  } finally {
    _setWireProvider(null);
    _resetResolveCache();
    await fs.rm(repo, { recursive: true, force: true });
  }
});
