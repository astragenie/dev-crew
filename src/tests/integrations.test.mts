// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { linkArtifactToSlice, getLinkedArtifacts } from "../scripts/lib/artifact-linkage.mjs";
import { findRelevantDecisions, writeDecisionFile } from "../scripts/lib/decisions-store.mjs";
import { decomposeSpec } from "../scripts/lib/spec-decomposer.mjs";
import { addSpec, updateSpecFrontmatter } from "../scripts/lib/spec-parser.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature, completeSlice } from "../scripts/lib/slice-linker.mjs";
// buildReviewLadder import removed (reviewer-ladder.mts deleted in FEAT-277)
import { inferScoresForSlice } from "../scripts/lib/score-inference.mjs";
import { mergeFrontmatter, parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { listBacklog } from "../scripts/lib/backlog-parser.mjs";

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
      stack: {},
      reviewers: { ladder: ["A", "B"] }
    })
  );
  return repo;
}

async function writeArtifact(repo, subdir, filename, body) {
  const dir = path.join(repo, ".claude/artifacts/crew", subdir);
  await fs.mkdir(dir, { recursive: true });
  const p = path.join(dir, filename);
  await fs.writeFile(p, body);
  return p;
}

test("linkArtifactToSlice preserves timestamp in artifact filename", async () => {
  const repo = await tmpRepo("al-link-ts-keep-");
  const feat = await addFeature(repo, { title: "keep ts" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const tsName = "20260524T083250Z-phase3-feat021-slice36-review-result.md";
  const artPath = await writeArtifact(repo, "reviews", tsName, "# review body");

  const result = await linkArtifactToSlice(repo, {
    sliceId: slice.id,
    artifactPath: artPath,
    kind: "reviews"
  });

  const expectedRel = `.claude/artifacts/crew/reviews/${tsName}`;
  assert.equal(result.artifactRel, expectedRel, "linked path keeps TS prefix");
  assert.equal(result.alreadyLinked, false);

  const dir = path.join(repo, ".claude/artifacts/crew/reviews");
  const onDisk = await fs.readdir(dir);
  assert.deepEqual(onDisk, [tsName]);

  const linked = await getLinkedArtifacts(repo, slice.id, "reviews");
  assert.deepEqual(linked, [expectedRel]);
});

test("linkArtifactToSlice appends to slice frontmatter and is idempotent", async () => {
  const repo = await tmpRepo("al-v19-link-");
  const feat = await addFeature(repo, { title: "x" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const artPath = await writeArtifact(repo, "reviews", "r1.md", "# review");
  const r1 = await linkArtifactToSlice(repo, {
    sliceId: slice.id,
    artifactPath: artPath,
    kind: "reviews"
  });
  assert.equal(r1.alreadyLinked, false);
  const r2 = await linkArtifactToSlice(repo, {
    sliceId: slice.id,
    artifactPath: artPath,
    kind: "reviews"
  });
  assert.equal(r2.alreadyLinked, true);
  const linked = await getLinkedArtifacts(repo, slice.id, "reviews");
  assert.equal(linked.length, 1);
  assert.match(linked[0], /reviews\/r1\.md$/);
});

test("score-inference prefers frontmatter linkage over body-scrape", async () => {
  const repo = await tmpRepo("al-v19-infer-linkage-");
  const feat = await addFeature(repo, { title: "x" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Artifact does NOT mention the slice id in body — only linkage would surface it
  const artPath = await writeArtifact(
    repo,
    "validations",
    "no-mention.md",
    "# Validation\n\n**Status:** PASS\n\nAll acceptance criteria PASS."
  );
  // Without linkage: regex fallback finds nothing (no slice id in body)
  const before = await inferScoresForSlice(repo, slice.id);
  assert.equal(before.artifactCounts.validations, 0);
  // After linkage: frontmatter walk picks it up
  await linkArtifactToSlice(repo, {
    sliceId: slice.id,
    artifactPath: artPath,
    kind: "validations"
  });
  const after = await inferScoresForSlice(repo, slice.id);
  assert.equal(after.artifactCounts.validations, 1);
  assert.ok(after.scores.test_confidence >= 0.8);
});

test("findRelevantDecisions matches affects_files literally + by path-suffix", async () => {
  const repo = await tmpRepo("al-v19-dec-rel-");
  await writeDecisionFile(repo, {
    id: "DEC-001",
    title: "Pagination",
    sliceId: "SLICE-01",
    rationale: "r"
  });
  // Patch in affects_files manually
  const decPath = path.join(repo, ".claude/artifacts/loop/decisions/DEC-001.md");
  const content = await fs.readFile(decPath, "utf8");
  await fs.writeFile(
    decPath,
    mergeFrontmatter(content, {
      affects_files: ["src/auth/middleware.cs", "src/api/Controllers/AuthController.cs"]
    })
  );
  const matches = await findRelevantDecisions(repo, ["astragenie/src/auth/middleware.cs"]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "DEC-001");
  assert.equal(matches[0].hits[0].decisionFile, "src/auth/middleware.cs");
});

test("findRelevantDecisions returns empty when no decision touches any file", async () => {
  const repo = await tmpRepo("al-v19-dec-norel-");
  await writeDecisionFile(repo, { id: "DEC-001", title: "x", sliceId: "SLICE-01", rationale: "r" });
  // No affects_files set
  const matches = await findRelevantDecisions(repo, ["src/foo.cs"]);
  assert.deepEqual(matches, []);
});

test("decomposeSpec accepts JSON-object array shape from researcher output", async () => {
  const repo = await tmpRepo("al-v19-decompose-json-");
  const spec = await addSpec(repo, { type: "prd", title: "Test PRD" });
  await updateSpecFrontmatter(spec.filePath, { status: "approved" });
  const result = await decomposeSpec(repo, spec.id, [
    { title: "Feature one", priority: "P0", category: "feature" },
    { title: "Feature two", priority: "P1" }
  ]);
  assert.equal(result.count, 2);
  const backlog = await listBacklog(repo);
  const f1 = backlog.find((f) => f.body.includes("Feature one"));
  assert.equal(f1.frontmatter.priority, "P0");
  assert.equal(f1.frontmatter.category, "feature");
});

test("completeSlice writes a crew handoff artifact", async () => {
  const repo = await tmpRepo("al-v19-handoff-");
  const feat = await addFeature(repo, { title: "h" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  assert.ok(result.handoff?.handoffPath, "handoff path should be returned");
  const content = await fs.readFile(result.handoff.handoffPath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.kind, "handoff");
  assert.equal(frontmatter.slice, slice.id);
  assert.equal(frontmatter.feature, feat.id);
  assert.match(content, /Slice .* complete/);
});

// buildReviewLadder tests removed — reviewer-ladder.mts deleted in FEAT-277
