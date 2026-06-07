import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { createGradeFile } from "../scripts/lib/grade-writer.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";

async function tmpRepo(prefix: string) {
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

test("createGradeFile includes identification line when feature and phase are set", async () => {
  const repo = await tmpRepo("al-grade-id-header-");
  // Create a feature with a phase so slice frontmatter carries them
  const feat = await addFeature(repo, { title: "ID Header Test" });
  // Patch slice frontmatter to include phase after creation
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Patch slice file to add phase
  const { parseFrontmatter: pf, serializeFrontmatter: sf } =
    await import("../scripts/lib/frontmatter.mjs");
  const sliceContent = await fs.readFile(slice.path, "utf8");
  const { frontmatter, body } = pf(sliceContent);
  await fs.writeFile(slice.path, sf({ ...frontmatter, phase: "3" }, body));

  const grade = await createGradeFile(repo, slice.id);
  assert.equal(grade.created, true);
  const content = await fs.readFile(grade.gradePath, "utf8");
  const { body: gradeBody } = pf(content);
  // Identification line must be present and in correct order
  assert.match(gradeBody, /\*\*Phase:\*\* 3/);
  assert.match(gradeBody, /\*\*Feature:\*\* FEAT-001/);
  assert.match(gradeBody, /\*\*Slice:\*\*/);
  // Phase must appear before Feature in the line
  const idLineMatch = gradeBody.match(/\*\*Phase:\*\*.*\*\*Feature:\*\*.*\*\*Slice:\*\*/);
  assert.ok(idLineMatch, "identification line must contain Phase · Feature · Slice in order");
});

test("createGradeFile omits identification line when phase and feature are null", async () => {
  const repo = await tmpRepo("al-grade-id-null-");
  // No feature or phase attached — standalone slice
  const grade = await createGradeFile(repo, "SLICE-42");
  assert.equal(grade.created, true);
  const content = await fs.readFile(grade.gradePath, "utf8");
  const { parseFrontmatter: pf } = await import("../scripts/lib/frontmatter.mjs");
  const { body: gradeBody } = pf(content);
  // No blank "**Phase:**" lines
  assert.doesNotMatch(gradeBody, /\*\*Phase:\*\*\s*$/m);
  assert.doesNotMatch(gradeBody, /\*\*Feature:\*\*\s*$/m);
});
