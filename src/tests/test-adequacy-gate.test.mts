import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { deriveTestAdequacyGate } from "../scripts/lib/test-adequacy-gate.mjs";

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

async function writeSlice(repo, reviews = []) {
  const sliceDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(sliceDir, { recursive: true });
  const slicePath = path.join(sliceDir, "SLICE_01_test.md");
  const reviewLines =
    reviews.length > 0 ? `reviews:\n${reviews.map((r) => `  - ${r}`).join("\n")}\n` : "";
  const content = `---\nid: SLICE-01\nstatus: pending\n${reviewLines}---\n# SLICE-01: test\n`;
  await fs.writeFile(slicePath, content);
  return slicePath;
}

async function writeReviewArtifact(repo, relPath, { testAdequacy = null, skipReason = null }: Record<string, unknown> = {}) {
  const absPath = path.join(repo, relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  const lines = [
    "# Review",
    "",
    "## Fields",
    "",
    "- Decision: PASS",
    `- Test Adequacy: ${testAdequacy ?? "-"}`
  ];
  if (skipReason) lines.push(`- Test Adequacy Skip Reason: ${skipReason}`);
  await fs.writeFile(absPath, lines.join("\n"));
  return relPath;
}

test("deriveTestAdequacyGate — no reviews linked → satisfied: true", async () => {
  const repo = await tmpRepo("al-tag-empty-");
  await writeSlice(repo, []);
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /no review artifacts/);
});

test("deriveTestAdequacyGate — slice not found → satisfied: true (no artifacts)", async () => {
  const repo = await tmpRepo("al-tag-noslice-");
  const result = await deriveTestAdequacyGate(repo, "SLICE-99");
  assert.equal(result.satisfied, true);
});

test("deriveTestAdequacyGate — all reviews have test adequacy → satisfied: true", async () => {
  const repo = await tmpRepo("al-tag-pass-");
  const rel = ".claude/artifacts/crew/reviews/review-001.md";
  await writeReviewArtifact(repo, rel, { testAdequacy: "All edge cases covered in integration tests" });
  await writeSlice(repo, [rel]);
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /test adequacy populated/);
});

test("deriveTestAdequacyGate — review with empty placeholder '-' → satisfied: false", async () => {
  const repo = await tmpRepo("al-tag-empty-placeholder-");
  const rel = ".claude/artifacts/crew/reviews/review-001.md";
  await writeReviewArtifact(repo, rel, { testAdequacy: "-" });
  await writeSlice(repo, [rel]);
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
  assert.ok(Array.isArray(result.emptyArtifacts));
  assert.equal(result.emptyArtifacts.length, 1);
  assert.match(result.reason, /test-adequacy-gate/);
});

test("deriveTestAdequacyGate — review with Test Adequacy Skip Reason → satisfied: true", async () => {
  const repo = await tmpRepo("al-tag-skipreason-");
  const rel = ".claude/artifacts/crew/reviews/review-001.md";
  await writeReviewArtifact(repo, rel, {
    testAdequacy: "-",
    skipReason: "doc-only slice, no behavior changed"
  });
  await writeSlice(repo, [rel]);
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
});

test("deriveTestAdequacyGate — two reviews, one missing test adequacy → satisfied: false", async () => {
  const repo = await tmpRepo("al-tag-partial-");
  const rel1 = ".claude/artifacts/crew/reviews/review-001.md";
  const rel2 = ".claude/artifacts/crew/reviews/review-002.md";
  await writeReviewArtifact(repo, rel1, { testAdequacy: "unit tests cover the new path" });
  await writeReviewArtifact(repo, rel2, { testAdequacy: "-" });
  await writeSlice(repo, [rel1, rel2]);
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
  assert.equal(result.emptyArtifacts.length, 1);
  assert.ok(result.emptyArtifacts[0].includes("review-002"));
});

test("deriveTestAdequacyGate — review file missing on disk → skipped (file unreadable)", async () => {
  const repo = await tmpRepo("al-tag-missing-file-");
  const rel = ".claude/artifacts/crew/reviews/ghost-review.md";
  await writeSlice(repo, [rel]);
  // artifact is linked in frontmatter but file does not exist
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  // unreadable file is skipped → still satisfied if no readable empty artifacts
  assert.equal(result.satisfied, true);
});
