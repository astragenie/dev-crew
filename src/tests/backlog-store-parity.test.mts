// FEAT-250 SLICE-2 (DEC-076): backlog-writer.mts is now a thin delegate over
// backlog-store.mts. This test pins AC-1 — byte-identical frontmatter output
// across the 11 existing callers — two ways:
//   1. Object identity: addFeature/updateFeatureFrontmatter/moveFeature/
//      ensureBacklogScaffold on backlog-writer.mjs must be the SAME function
//      object as their backlog-store.mjs counterparts (re-export, not a
//      wrapper) — zero indirection, zero behavior-drift surface.
//   2. Black-box byte-identical output: calling the same operation through
//      backlog-writer.mjs vs. backlog-store.mjs directly, against parallel
//      fixture repos with identical inputs, produces byte-identical file
//      contents. This holds even if a future change swaps a re-export for a
//      wrapper — object identity alone wouldn't catch that regression.
// findFeatureById is a deliberate exception: DEC-076 documents it as a thin
// wrapper (`getById(repoPath, "feature", id, config)`), not a re-export, so
// it is checked for behavioral (deep-equal) parity instead of `===`.

import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  addFeature,
  updateFeatureFrontmatter,
  moveFeature,
  findFeatureById,
  ensureBacklogScaffold
} from "../scripts/lib/backlog-writer.mjs";
import {
  createFeature,
  updateFeatureFrontmatter as storeUpdateFeatureFrontmatter,
  moveFeature as storeMoveFeature,
  getById,
  ensureBacklogScaffold as storeEnsureBacklogScaffold
} from "../scripts/lib/backlog-store.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ preset: "dotnet-python", loop: {}, stack: {} })
  );
  return repo;
}

describe("backlog-store parity (FEAT-250 SLICE-2 / DEC-076)", () => {
  it("addFeature/createFeature, updateFeatureFrontmatter, moveFeature, ensureBacklogScaffold are the same function object", () => {
    assert.equal(
      addFeature,
      createFeature,
      "addFeature must be a direct re-export of createFeature"
    );
    assert.equal(
      updateFeatureFrontmatter,
      storeUpdateFeatureFrontmatter,
      "backlog-writer's updateFeatureFrontmatter must be the same object as backlog-store's"
    );
    assert.equal(
      moveFeature,
      storeMoveFeature,
      "backlog-writer's moveFeature must be the same object as backlog-store's"
    );
    assert.equal(
      ensureBacklogScaffold,
      storeEnsureBacklogScaffold,
      "backlog-writer's ensureBacklogScaffold must be the same object as backlog-store's"
    );
  });

  it("addFeature (via backlog-writer) and createFeature (via backlog-store) produce byte-identical output for identical input", async () => {
    const repoA = await tmpRepo("bs-parity-writer-");
    const repoB = await tmpRepo("bs-parity-store-");
    try {
      const optsA = {
        title: "Parity fixture feature",
        priority: "P1",
        category: "feature",
        target_release: "v1.0",
        derived_from: "FEAT-999",
        config: null
      };
      const optsB = { ...optsA };

      const resultA = await addFeature(repoA, optsA);
      const resultB = await createFeature(repoB, optsB);

      const contentsA = await fs.readFile(resultA.filePath, "utf8");
      const contentsB = await fs.readFile(resultB.filePath, "utf8");

      assert.equal(
        resultA.id,
        resultB.id,
        "same nextFeatureId sequence on an empty fixture backlog"
      );
      assert.equal(
        contentsA,
        contentsB,
        "addFeature and createFeature must write byte-identical file contents"
      );
      assert.deepEqual(resultA.frontmatter, resultB.frontmatter);
    } finally {
      await fs.rm(repoA, { recursive: true, force: true });
      await fs.rm(repoB, { recursive: true, force: true });
    }
  });

  it("updateFeatureFrontmatter (via backlog-writer) and (via backlog-store) produce byte-identical output for identical input", async () => {
    const repoA = await tmpRepo("bs-parity-ufm-writer-");
    const repoB = await tmpRepo("bs-parity-ufm-store-");
    try {
      const featA = await addFeature(repoA, { title: "UFM parity fixture", config: null });
      const featB = await createFeature(repoB, { title: "UFM parity fixture", config: null });

      const mergedA = await updateFeatureFrontmatter(
        featA.filePath,
        { priority: "P0", category: "bug" },
        repoA,
        null
      );
      const mergedB = await storeUpdateFeatureFrontmatter(
        featB.filePath,
        { priority: "P0", category: "bug" },
        repoB,
        null
      );

      const contentsA = await fs.readFile(featA.filePath, "utf8");
      const contentsB = await fs.readFile(featB.filePath, "utf8");

      assert.equal(contentsA, contentsB);
      assert.deepEqual(mergedA, mergedB);
    } finally {
      await fs.rm(repoA, { recursive: true, force: true });
      await fs.rm(repoB, { recursive: true, force: true });
    }
  });

  it("moveFeature (via backlog-writer) and (via backlog-store) produce byte-identical output for identical input", async () => {
    const repoA = await tmpRepo("bs-parity-mv-writer-");
    const repoB = await tmpRepo("bs-parity-mv-store-");
    try {
      const featA = await addFeature(repoA, {
        title: "Move parity fixture",
        priority: "P2",
        category: "chore",
        config: null
      });
      const featB = await createFeature(repoB, {
        title: "Move parity fixture",
        priority: "P2",
        category: "chore",
        config: null
      });

      const moveResultA = await moveFeature(featA.filePath, "triaged", {}, repoA, null);
      const moveResultB = await storeMoveFeature(featB.filePath, "triaged", {}, repoB, null);

      const contentsA = await fs.readFile(moveResultA.to, "utf8");
      const contentsB = await fs.readFile(moveResultB.to, "utf8");

      assert.equal(contentsA, contentsB);
      assert.equal(
        await fs
          .access(moveResultA.from)
          .then(() => true)
          .catch(() => false),
        false,
        "source file must be removed after move"
      );
    } finally {
      await fs.rm(repoA, { recursive: true, force: true });
      await fs.rm(repoB, { recursive: true, force: true });
    }
  });

  it("findFeatureById (backlog-writer wrapper) matches getById(kind:'feature') (backlog-store) behaviorally", async () => {
    const repo = await tmpRepo("bs-parity-getbyid-");
    try {
      const feat = await addFeature(repo, {
        title: "getById parity fixture",
        priority: "P3",
        config: null
      });

      const viaWrapper = await findFeatureById(repo, feat.id, null);
      const viaStore = await getById(repo, "feature", feat.id, null);

      assert.deepEqual(viaWrapper, viaStore);
      assert.notEqual(
        findFeatureById,
        getById,
        "findFeatureById is a deliberate thin wrapper per DEC-076, not a re-export"
      );

      const viaWrapperMissing = await findFeatureById(repo, "FEAT-NOPE", null);
      assert.equal(viaWrapperMissing, null);
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });
});
