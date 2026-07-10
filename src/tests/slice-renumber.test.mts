// FEAT-257 SLICE-B (DEC-079) — renumber CLI core.
//
// Covers the DEC-079 SLICE-B test list: slice-file rename across state
// dirs, a spanning sample of artifact-naming-surface files (KIND_REGISTRY
// tight-token form + a legacy kebab-form file), the 2 bespoke trajectory/
// events families + the shape-marker family, FEAT frontmatter `slices:`
// update, ledger append-not-mutate behavior, and refuse-on-collision. Plus
// the 2 gaps the SLICE-B review flagged: a numerically-adjacent-id
// non-cross-match regression test, and a mid-operation partial-failure test
// (via the `_internals.renameFile` DI seam) asserting the thrown error
// carries exactly what had already been renamed.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, test } from "bun:test";

import { buildArtifactFilename } from "../scripts/lib/artifact-naming.mjs";
import {
  _internals,
  renumberSlice,
  SliceIdCollisionError,
  SliceNotFoundError,
  SliceRenumberPartialFailureError
} from "../scripts/lib/slice-renumber.mjs";

const cleanupDirs: string[] = [];

afterEach(async () => {
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop() as string;
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

async function tmpRepo(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  cleanupDirs.push(dir);
  return dir;
}

const SLICES_ROOT = ".claude/artifacts/loop/ai-loop/slices";
const BACKLOG_ROOT = ".claude/artifacts/loop/backlog";

async function writeFile(repo: string, rel: string, content: string): Promise<string> {
  const full = path.join(repo, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content);
  return full;
}

async function seedSlice(
  repo: string,
  sliceId: string,
  featureId: string,
  state = "pending"
): Promise<string> {
  const base = `${sliceId.replace("-", "_")}_TEST_SLICE.md`;
  return writeFile(
    repo,
    `${SLICES_ROOT}/${state}/${base}`,
    `---\nid: ${sliceId}\nstatus: ${state}\nfeature: ${featureId}\n---\n# ${sliceId}: test slice\n`
  );
}

async function seedFeature(repo: string, featureId: string, sliceIds: string[]): Promise<string> {
  const slicesYaml = `[${sliceIds.join(", ")}]`;
  return writeFile(
    repo,
    `${BACKLOG_ROOT}/in-progress/${featureId}.md`,
    `---\nid: ${featureId}\nstatus: in-progress\nslices: ${slicesYaml}\n---\n# ${featureId}: test feature\n`
  );
}

async function readJsonlLines(filePath: string): Promise<any[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

describe("renumberSlice", () => {
  test("renames the slice markdown file in place, preserving state dir", async () => {
    const repo = await tmpRepo("renum-md-");
    await seedSlice(repo, "SLICE-37", "FEAT-100", "pending");
    await seedFeature(repo, "FEAT-100", ["SLICE-37"]);

    const result = await renumberSlice(repo, "SLICE-37", "SLICE-48", null);

    const pendingDir = path.join(repo, SLICES_ROOT, "pending");
    const files = await fs.readdir(pendingDir);
    assert.ok(
      files.some((f) => f.startsWith("SLICE_48_")),
      "new-id file present in pending/"
    );
    assert.ok(!files.some((f) => f.startsWith("SLICE_37_")), "old-id file gone from pending/");

    const newFile = files.find((f) => f.startsWith("SLICE_48_")) as string;
    const raw = await fs.readFile(path.join(pendingDir, newFile), "utf8");
    assert.match(raw, /id: SLICE-48/, "frontmatter id field updated");
    assert.ok(result.renamed.length > 0);
  });

  for (const state of ["pending", "in-progress", "needs-review", "completed"]) {
    test(`renames the slice file when it lives under ${state}/`, async () => {
      const repo = await tmpRepo(`renum-state-${state}-`);
      await seedSlice(repo, "SLICE-10", "FEAT-200", state);
      await seedFeature(repo, "FEAT-200", ["SLICE-10"]);

      await renumberSlice(repo, "SLICE-10", "SLICE-11", null);

      const stateDir = path.join(repo, SLICES_ROOT, state);
      const files = await fs.readdir(stateDir);
      assert.ok(
        files.some((f) => f.startsWith("SLICE_11_")),
        `renamed file lands back under ${state}/`
      );
    });
  }

  test("renames a spanning sample of KIND_REGISTRY artifacts (tight-token + legacy kebab form)", async () => {
    const repo = await tmpRepo("renum-artifacts-");
    await seedSlice(repo, "SLICE-37", "FEAT-100", "pending");
    await seedFeature(repo, "FEAT-100", ["SLICE-37"]);

    const gradeName = buildArtifactFilename({
      ts: "20260610T120000Z",
      kind: "grade",
      featureId: "FEAT-100",
      sliceId: "SLICE-37",
      ext: "md"
    });
    await writeFile(repo, `.claude/artifacts/loop/grades/${gradeName}`, "# grade\n");

    const handoffName = buildArtifactFilename({
      ts: "20260610T130000Z",
      kind: "handoff",
      sliceId: "SLICE-37",
      ext: "md"
    });
    await writeFile(repo, `.claude/artifacts/crew/handoffs/${handoffName}`, "# handoff\n");

    // Legacy/crew-slugified kebab form observed on disk (e.g. review-result
    // files) — "slice" and the number as two adjacent dash components,
    // not the KIND_REGISTRY tight token.
    await writeFile(
      repo,
      ".claude/artifacts/crew/reviews/2026-07-10-slice-37-review.md",
      "# review\n"
    );

    await renumberSlice(repo, "SLICE-37", "SLICE-48", null);

    const gradeFiles = await fs.readdir(path.join(repo, ".claude/artifacts/loop/grades"));
    assert.ok(
      gradeFiles.some((f) => f.includes("slice48")),
      "grade file renamed to slice48 token"
    );
    assert.ok(!gradeFiles.some((f) => f.includes("slice37")), "old grade file gone");

    const handoffFiles = await fs.readdir(path.join(repo, ".claude/artifacts/crew/handoffs"));
    assert.ok(
      handoffFiles.some((f) => f.includes("slice48")),
      "handoff file renamed to slice48 token"
    );

    const reviewFiles = await fs.readdir(path.join(repo, ".claude/artifacts/crew/reviews"));
    assert.ok(
      reviewFiles.some((f) => f === "2026-07-10-slice-48-review.md"),
      "kebab-form review file renamed slice-37 -> slice-48"
    );
  });

  test("renames the 3 bespoke-path families: trajectory JSONL, events JSONL, shape-marker JSON", async () => {
    const repo = await tmpRepo("renum-bespoke-");
    await seedSlice(repo, "SLICE-37", "FEAT-100", "pending");
    await seedFeature(repo, "FEAT-100", ["SLICE-37"]);

    await writeFile(
      repo,
      ".claude/artifacts/loop/trajectories/SLICE-37-trajectory.jsonl",
      '{"type":"step","sliceId":"SLICE-37"}\n'
    );
    await writeFile(
      repo,
      ".claude/artifacts/loop/trajectories/SLICE-37-events.jsonl",
      '{"type":"workflow_state_changed","sliceId":"SLICE-37"}\n'
    );
    await writeFile(
      repo,
      ".claude/artifacts/loop/shape-markers/SLICE-37.json",
      JSON.stringify({
        sliceId: "SLICE-37",
        shape: "s",
        rationale: "r",
        inlinePath: true,
        ts: "now"
      })
    );

    const result = await renumberSlice(repo, "SLICE-37", "SLICE-48", null);

    const trajDir = path.join(repo, ".claude/artifacts/loop/trajectories");
    const trajFiles = await fs.readdir(trajDir);
    assert.ok(trajFiles.includes("SLICE-48-trajectory.jsonl"), "trajectory JSONL renamed");
    assert.ok(!trajFiles.includes("SLICE-37-trajectory.jsonl"), "old trajectory JSONL gone");

    // Original single events line survives (rename preserves content) plus
    // the corrective renumber event gets appended to the renamed file.
    const eventsLines = await readJsonlLines(path.join(trajDir, "SLICE-48-events.jsonl"));
    assert.equal(eventsLines.length, 2, "original event line + 1 corrective renumber event");
    assert.equal(eventsLines[0].sliceId, "SLICE-37", "original event line untouched (append-only)");
    assert.equal(eventsLines[1].type, "slice_renumber");
    assert.equal(eventsLines[1].sliceId, "SLICE-48");

    const shapeExists = await fs
      .access(path.join(repo, ".claude/artifacts/loop/shape-markers/SLICE-48.json"))
      .then(() => true)
      .catch(() => false);
    assert.ok(shapeExists, "shape-marker JSON renamed");

    assert.ok(result.ledgerEvents.some((e) => e.includes("SLICE-48-events.jsonl")));
  });

  test("rewrites the owning FEAT's slices: frontmatter entry", async () => {
    const repo = await tmpRepo("renum-feat-");
    await seedSlice(repo, "SLICE-37", "FEAT-100", "pending");
    await seedFeature(repo, "FEAT-100", ["SLICE-36", "SLICE-37"]);

    await renumberSlice(repo, "SLICE-37", "SLICE-48", null);

    const featRaw = await fs.readFile(
      path.join(repo, BACKLOG_ROOT, "in-progress/FEAT-100.md"),
      "utf8"
    );
    assert.match(featRaw, /slices:.*SLICE-48/, "SLICE-48 present in slices list");
    assert.doesNotMatch(featRaw, /slices:.*SLICE-37/, "SLICE-37 no longer present");
    assert.match(featRaw, /SLICE-36/, "sibling slice id untouched");
  });

  test("appends a corrective entry to learnings.jsonl via logLearning, without mutating existing lines", async () => {
    const repo = await tmpRepo("renum-ledgers-");
    await seedSlice(repo, "SLICE-37", "FEAT-100", "pending");
    await seedFeature(repo, "FEAT-100", ["SLICE-37"]);

    const learningsFile = path.join(repo, ".claude/artifacts/loop/learnings.jsonl");
    await writeFile(
      repo,
      ".claude/artifacts/loop/learnings.jsonl",
      '{"id":"pre-existing","key":"k","insight":"i"}\n'
    );

    await renumberSlice(repo, "SLICE-37", "SLICE-48", null);

    const learningLines = await readJsonlLines(learningsFile);
    assert.equal(learningLines.length, 2, "pre-existing learning untouched, 1 new appended");
    assert.equal(learningLines[0].id, "pre-existing");
    assert.equal(learningLines[1].key, "slice-renumber");
    assert.equal(learningLines[1].sliceId, "SLICE-48");

    // grades.jsonl is deliberately never touched by a renumber — its
    // GradeEventPayload schema requires real scores, and this repo already
    // guards against fabricated all-zero-score stubs landing there (FEAT-258).
    const gradesExists = await fs
      .access(path.join(repo, ".claude/artifacts/loop/grades.jsonl"))
      .then(() => true)
      .catch(() => false);
    assert.ok(!gradesExists, "grades.jsonl not created/touched by a renumber");
  });

  test("adjacent numerically-similar slice ids are never cross-matched (DEC-079 top risk)", async () => {
    const repo = await tmpRepo("renum-adjacent-");
    await seedSlice(repo, "SLICE-1", "FEAT-100", "pending");
    await seedFeature(repo, "FEAT-100", ["SLICE-1"]);
    await seedSlice(repo, "SLICE-14", "FEAT-101", "pending");
    await seedFeature(repo, "FEAT-101", ["SLICE-14"]);

    const grade1 = buildArtifactFilename({
      ts: "20260610T120000Z",
      kind: "grade",
      sliceId: "SLICE-1",
      ext: "md"
    });
    const grade14 = buildArtifactFilename({
      ts: "20260610T120000Z",
      kind: "grade",
      sliceId: "SLICE-14",
      ext: "md"
    });
    await writeFile(repo, `.claude/artifacts/loop/grades/${grade1}`, "# grade\n");
    await writeFile(repo, `.claude/artifacts/loop/grades/${grade14}`, "# grade\n");
    await writeFile(
      repo,
      ".claude/artifacts/crew/reviews/2026-07-10-slice-1-review.md",
      "# review\n"
    );
    await writeFile(
      repo,
      ".claude/artifacts/crew/reviews/2026-07-10-slice-14-review.md",
      "# review\n"
    );

    await renumberSlice(repo, "SLICE-1", "SLICE-99", null);

    const sliceFiles = await fs.readdir(path.join(repo, SLICES_ROOT, "pending"));
    assert.ok(
      sliceFiles.some((f) => f.startsWith("SLICE_99_")),
      "SLICE-1 renamed to SLICE-99"
    );
    assert.ok(
      sliceFiles.some((f) => f.startsWith("SLICE_14_")),
      "SLICE-14 slice file untouched"
    );

    const gradeFiles = await fs.readdir(path.join(repo, ".claude/artifacts/loop/grades"));
    assert.ok(
      gradeFiles.some((f) => f.includes("slice99")),
      "SLICE-1's grade file renamed"
    );
    assert.ok(
      gradeFiles.some((f) => f === grade14),
      "SLICE-14's grade file byte-for-byte untouched"
    );

    const reviewFiles = await fs.readdir(path.join(repo, ".claude/artifacts/crew/reviews"));
    assert.ok(
      reviewFiles.includes("2026-07-10-slice-99-review.md"),
      "SLICE-1's kebab-form review file renamed"
    );
    assert.ok(
      reviewFiles.includes("2026-07-10-slice-14-review.md"),
      "SLICE-14's kebab-form review file untouched"
    );

    const featRaw = await fs.readFile(
      path.join(repo, BACKLOG_ROOT, "in-progress/FEAT-101.md"),
      "utf8"
    );
    assert.match(featRaw, /SLICE-14/, "sibling FEAT-101's slices: entry untouched");
  });

  test("a mid-operation rename failure surfaces partial progress instead of failing silently", async () => {
    const repo = await tmpRepo("renum-midfail-");
    await seedSlice(repo, "SLICE-37", "FEAT-100", "pending");
    await seedFeature(repo, "FEAT-100", ["SLICE-37"]);

    const grade1 = buildArtifactFilename({
      ts: "20260610T120000Z",
      kind: "grade",
      sliceId: "SLICE-37",
      ext: "md"
    });
    const handoff1 = buildArtifactFilename({
      ts: "20260610T130000Z",
      kind: "handoff",
      sliceId: "SLICE-37",
      ext: "md"
    });
    await writeFile(repo, `.claude/artifacts/loop/grades/${grade1}`, "# grade\n");
    await writeFile(repo, `.claude/artifacts/crew/handoffs/${handoff1}`, "# handoff\n");

    const originalRenameFile = _internals.renameFile;
    let renameCalls = 0;
    _internals.renameFile = async (from: string, to: string) => {
      renameCalls += 1;
      // Let the first artifact rename through, fail the second one — the
      // slice markdown file itself has already renamed by this point (it
      // goes through BacklogStore's renameSliceId, not this seam), so real
      // partial progress exists before the simulated failure.
      if (renameCalls === 2) {
        throw new Error("simulated disk failure");
      }
      return originalRenameFile(from, to);
    };

    try {
      await assert.rejects(
        () => renumberSlice(repo, "SLICE-37", "SLICE-48", null),
        (err: unknown) => {
          assert.ok(
            err instanceof SliceRenumberPartialFailureError,
            "wraps as the partial-failure type"
          );
          assert.ok(
            err.renamed.length >= 1,
            "at least the slice markdown file rename is recorded before the failure"
          );
          assert.ok(
            err.renamed.some((r) => r.includes("SLICE_48")),
            "the completed slice-file rename is named in the partial-progress list"
          );
          assert.equal(err.fromId, "SLICE-37");
          assert.equal(err.toId, "SLICE-48");
          assert.ok(err.underlyingError instanceof Error);
          return true;
        }
      );
    } finally {
      _internals.renameFile = originalRenameFile;
    }

    // The partial state the error reported really did land on disk — the
    // slice file was renamed even though the operation as a whole failed.
    const pendingFiles = await fs.readdir(path.join(repo, SLICES_ROOT, "pending"));
    assert.ok(
      pendingFiles.some((f) => f.startsWith("SLICE_48_")),
      "slice-file rename actually landed (partial state, not rolled back)"
    );
  });

  test("refuses cleanly when --to already exists as a slice file (no mutation)", async () => {
    const repo = await tmpRepo("renum-collide-slice-");
    await seedSlice(repo, "SLICE-37", "FEAT-100", "pending");
    await seedFeature(repo, "FEAT-100", ["SLICE-37"]);
    await seedSlice(repo, "SLICE-48", "FEAT-101", "pending");
    await seedFeature(repo, "FEAT-101", ["SLICE-48"]);

    await assert.rejects(
      () => renumberSlice(repo, "SLICE-37", "SLICE-48", null),
      SliceIdCollisionError
    );

    const pendingFiles = await fs.readdir(path.join(repo, SLICES_ROOT, "pending"));
    assert.ok(
      pendingFiles.some((f) => f.startsWith("SLICE_37_")),
      "source slice untouched"
    );
    assert.ok(
      pendingFiles.some((f) => f.startsWith("SLICE_48_")),
      "colliding slice untouched"
    );
  });

  test("refuses cleanly when --to already exists only as a referencing artifact (no slice file)", async () => {
    const repo = await tmpRepo("renum-collide-artifact-");
    await seedSlice(repo, "SLICE-37", "FEAT-100", "pending");
    await seedFeature(repo, "FEAT-100", ["SLICE-37"]);

    const gradeName = buildArtifactFilename({
      ts: "20260610T120000Z",
      kind: "grade",
      sliceId: "SLICE-48",
      ext: "md"
    });
    await writeFile(repo, `.claude/artifacts/loop/grades/${gradeName}`, "# grade\n");

    await assert.rejects(
      () => renumberSlice(repo, "SLICE-37", "SLICE-48", null),
      SliceIdCollisionError
    );
  });

  test("throws SliceNotFoundError when --from does not resolve to a slice file", async () => {
    const repo = await tmpRepo("renum-notfound-");
    await assert.rejects(
      () => renumberSlice(repo, "SLICE-99", "SLICE-100", null),
      SliceNotFoundError
    );
  });

  test("dry-run lists what would happen and mutates nothing", async () => {
    const repo = await tmpRepo("renum-dryrun-");
    await seedSlice(repo, "SLICE-37", "FEAT-100", "pending");
    await seedFeature(repo, "FEAT-100", ["SLICE-37"]);

    const result = await renumberSlice(repo, "SLICE-37", "SLICE-48", null, { dryRun: true });

    assert.ok(result.renamed.length > 0);
    const pendingFiles = await fs.readdir(path.join(repo, SLICES_ROOT, "pending"));
    assert.ok(
      pendingFiles.some((f) => f.startsWith("SLICE_37_")),
      "source slice file untouched"
    );
    assert.ok(!pendingFiles.some((f) => f.startsWith("SLICE_48_")), "no new file created");

    const featRaw = await fs.readFile(
      path.join(repo, BACKLOG_ROOT, "in-progress/FEAT-100.md"),
      "utf8"
    );
    assert.match(featRaw, /SLICE-37/, "FEAT frontmatter untouched in dry-run");

    const learningsExists = await fs
      .access(path.join(repo, ".claude/artifacts/loop/learnings.jsonl"))
      .then(() => true)
      .catch(() => false);
    assert.ok(!learningsExists, "no ledger file created in dry-run");
  });
});
