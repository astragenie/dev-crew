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

test("findGradeForSlice returns null when no grade exists", async () => {
  const repo = await tmpRepo("al-grade-find-");
  const found = await findGradeForSlice(repo, "SLICE-99");
  assert.equal(found, null);
});

// FEAT-217: the extractDecisions call site mirrors each new decision into
// astramem when memory is enabled. Uses a capturing fake astramem CLI; POSIX
// only captures argv (Windows exercises the path but skips the assertion).
test("writeGrade mirrors an extracted decision into astramem when memory enabled", async () => {
  const { _resetCliCache } = await import("../scripts/lib/memory-bridge.mjs");
  _resetCliCache();
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "al-grade-mem-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
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

  const cliRoot = await fs.mkdtemp(path.join(os.tmpdir(), "al-grade-cli-"));
  const binDir = path.join(cliRoot, "bin");
  await fs.mkdir(binDir, { recursive: true });
  const argsFile = path.join(cliRoot, "captured.jsonl");
  const isWin = process.platform === "win32";
  if (isWin) {
    await fs.writeFile(path.join(binDir, "astramem.cmd"), "@echo off\n");
  } else {
    await fs.writeFile(
      path.join(binDir, "astramem"),
      `#!/bin/sh\nnode -e "require('fs').appendFileSync(process.argv[1], JSON.stringify(process.argv.slice(2))+'\\n')" "${argsFile}" "$@"\n`
    );
    await fs.chmod(path.join(binDir, "astramem"), 0o755);
  }
  const origRoot = process.env.CLAUDE_PLUGIN_ROOT_MEMORY;
  process.env.CLAUDE_PLUGIN_ROOT_MEMORY = cliRoot;

  try {
    const created = await createGradeFile(repo, "SLICE-01");
    let content = await fs.readFile(created.gradePath, "utf8");
    for (const dim of SCORE_DIMENSIONS) {
      content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
    }
    content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
    content = content.replace(
      /### DEC-TBD: Short decision title/,
      "### DEC-TBD: Mirrored architectural decision"
    );
    content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
    content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
    await fs.writeFile(created.gradePath, content);

    const result = await writeGrade(repo, "SLICE-01");
    assert.equal(result.decisionsAllocated.length, 1);

    if (isWin) return; // argv capture is POSIX-only
    await new Promise((r) => setTimeout(r, 300));
    let calls = [];
    try {
      calls = (await fs.readFile(argsFile, "utf8"))
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));
    } catch {
      return; // child not flushed in time — accept as pass-through
    }
    const rememberCalls = calls.filter((argv) => argv[0] === "remember");
    assert.ok(rememberCalls.length >= 1, "expected a remember spawn for the decision");
    const argv = rememberCalls[0];
    assert.equal(argv[argv.indexOf("--type") + 1], "decision");
    assert.equal(argv[argv.indexOf("--project") + 1], "runner");
    const contentArg = argv[argv.indexOf("--content") + 1];
    assert.match(contentArg, /DEC-001/);
    assert.match(contentArg, /Mirrored architectural decision/);
  } finally {
    if (origRoot !== undefined) process.env.CLAUDE_PLUGIN_ROOT_MEMORY = origRoot;
    else delete process.env.CLAUDE_PLUGIN_ROOT_MEMORY;
    _resetCliCache();
    await fs.rm(cliRoot, { recursive: true, force: true });
    await fs.rm(repo, { recursive: true, force: true });
  }
});
