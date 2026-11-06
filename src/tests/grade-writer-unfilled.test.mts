// FEAT-025 (SLICE-50) AC-4: the grade WRITE path must reject a grade file
// that still contains an unreplaced `<fill ...>` scaffold token (e.g. the H1
// `<fill title>` stub createGradeFile injects) instead of silently accepting
// it as real content. Root cause: GRADE_PLACEHOLDER_PATTERNS
// (grade-parser.mts) never matched the title placeholder, so a grade whose
// title was never filled in passed writeGrade's unfilled-template check.
//
// Two layers of coverage:
//  1. Lib level — writeGrade rejects with code GRADE_TEMPLATE_UNFILLED and a
//     "grade template unfilled" message when `<fill title>` is still present.
//  2. CLI level — `loop.mts slice grade-write` exits 2 (not the generic 1)
//     for this specific failure, so callers can distinguish "needs a real
//     grade" from an arbitrary crash.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { detectPlaceholders, SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude", "loop.json"),
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

test("detectPlaceholders flags the literal <fill title> scaffold token", () => {
  const body = "# SLICE-50: <fill title> — Grade\n\n## Scores\n";
  const found = detectPlaceholders(body);
  assert.ok(
    found.some((line) => line.includes("<fill title>")),
    `expected <fill title> to be detected, got: ${JSON.stringify(found)}`
  );
});

test("detectPlaceholders flags any other <fill ...> token, not just <fill title>", () => {
  const body = "Some note: <fill rationale here>\n";
  const found = detectPlaceholders(body);
  assert.ok(found.length > 0, "expected a generic <fill ...> token to be flagged");
});

test("detectPlaceholders does not flag ordinary angle-bracket text", () => {
  const body = "See <https://example.com> for details.\n";
  const found = detectPlaceholders(body);
  assert.equal(found.length, 0, `expected no false positive, got: ${JSON.stringify(found)}`);
});

test("AC-4: writeGrade rejects a grade file still containing <fill title> with GRADE_TEMPLATE_UNFILLED", async () => {
  const repo = await tmpRepo("al-grade-unfilled-title-");
  const created = await createGradeFile(repo, "SLICE-01");
  let content = await fs.readFile(created.gradePath, "utf8");
  // Fill every score + every other placeholder EXCEPT the title — isolates
  // the title check from the other (already-covered) placeholder checks.
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  assert.ok(content.includes("<fill title>"), "fixture must still contain <fill title>");
  await fs.writeFile(created.gradePath, content);

  await assert.rejects(
    () => writeGrade(repo, "SLICE-01"),
    (err: NodeJS.ErrnoException) =>
      err.code === "GRADE_TEMPLATE_UNFILLED" && /grade template unfilled/i.test(err.message)
  );
});

test("AC-4: writeGrade succeeds once <fill title> is replaced with a real title", async () => {
  const repo = await tmpRepo("al-grade-filled-title-");
  const created = await createGradeFile(repo, "SLICE-02");
  let content = await fs.readFile(created.gradePath, "utf8");
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  content = content.replace("<fill title>", "Real Title");
  await fs.writeFile(created.gradePath, content);

  const result = await writeGrade(repo, "SLICE-02");
  assert.equal(result.sliceId, "SLICE-02");
});

test("AC-4 (CLI): slice grade-write exits 2 (not 1) when the grade template is unfilled", async () => {
  const repo = await tmpRepo("al-grade-cli-exit2-");
  const created = await createGradeFile(repo, "SLICE-03");
  // Leave the default template fully unfilled (all-zero scores + <fill title>).
  void created;

  const repoRoot = path.resolve(import.meta.dir, "..", "..");
  const proc = Bun.spawn(
    [
      "bun",
      path.join(repoRoot, "src", "scripts", "loop.mts"),
      "slice",
      "grade-write",
      "--id",
      "SLICE-03"
    ],
    { cwd: repo, stdout: "pipe", stderr: "pipe" }
  );
  await proc.exited;
  assert.equal(proc.exitCode, 2, `expected exit code 2, got ${proc.exitCode}`);
  const err = await new Response(proc.stderr).text();
  assert.match(err, /grade template unfilled/i);
});
