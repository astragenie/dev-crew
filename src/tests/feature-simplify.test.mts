import { describe, it, beforeAll, afterAll } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { featureSimplify } from "../scripts/lib/slice-linker/feature-lifecycle.mjs";

describe("featureSimplify", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "feat-simplify-"));
    execFileSync("git", ["init"], { cwd: tmpDir });
    execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: tmpDir });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: tmpDir });
    execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: tmpDir });
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns simplifyRan:false and skipped when skipSimplify is true", async () => {
    const dispatched: string[] = [];
    const mockDispatch = async (opts: any) => {
      dispatched.push(opts.agent);
      return { ok: true, skipped: false, durationMs: 0 };
    };
    const result = await featureSimplify(tmpDir, "FEAT-001", {
      skipSimplify: true,
      sliceId: "SLICE-01",
      dispatchFn: mockDispatch
    });
    assert.equal(result.simplifyRan, false);
    assert.equal(result.skipped, true);
    assert.equal(result.skipReason, "skip-simplify-flag");
    assert.equal(dispatched.length, 0);
  });

  it("returns simplifyRan:false and skips when no .mts/.mjs files found", async () => {
    const mockDispatch = async (_opts: any) => ({ ok: true, skipped: false, durationMs: 0 });
    const result = await featureSimplify(tmpDir, "FEAT-003", {
      skipSimplify: false,
      sliceId: "SLICE-03",
      startedAt: "2099-01-01T00:00:00.000Z",
      dispatchFn: mockDispatch
    });
    assert.equal(result.simplifyRan, false);
    assert.equal(result.skipped, true);
    assert.equal(result.skipReason, "no-source-files");
  });

  it("collectChangedSourceFiles excludes deleted .mts files (B-6 diff-filter=AM)", async () => {
    const testRepo = await fs.mkdtemp(path.join(os.tmpdir(), "b6-del-"));
    try {
      execFileSync("git", ["init"], { cwd: testRepo });
      execFileSync("git", ["config", "user.email", "t@e"], { cwd: testRepo });
      execFileSync("git", ["config", "user.name", "T"], { cwd: testRepo });

      // Add file with committer date in the past (before the feature window).
      // git --since filters by committer date (GIT_COMMITTER_DATE), not author date.
      const pastEnv = {
        ...process.env,
        GIT_AUTHOR_DATE: "2020-01-01T00:00:00Z",
        GIT_COMMITTER_DATE: "2020-01-01T00:00:00Z"
      };
      await fs.writeFile(path.join(testRepo, "to-delete.mts"), "export const x = 2;\n");
      execFileSync("git", ["add", "to-delete.mts"], { cwd: testRepo });
      execFileSync("git", ["commit", "-m", "add"], { cwd: testRepo, env: pastEnv });

      // startedAt marks the feature window start — between the two commits
      const startedAt = "2021-01-01T00:00:00.000Z";

      // Delete file with committer date inside the feature window.
      const futureEnv = {
        ...process.env,
        GIT_AUTHOR_DATE: "2022-01-01T00:00:00Z",
        GIT_COMMITTER_DATE: "2022-01-01T00:00:00Z"
      };
      execFileSync("git", ["rm", "to-delete.mts"], { cwd: testRepo });
      execFileSync("git", ["commit", "-m", "delete"], { cwd: testRepo, env: futureEnv });

      const mockDispatch = async (_opts: any) => ({ ok: true, skipped: false, durationMs: 0 });
      const result = await featureSimplify(testRepo, "FEAT-B6", {
        skipSimplify: false,
        sliceId: "SLICE-B6",
        startedAt,
        dispatchFn: mockDispatch
      });
      // Only the delete commit (type D) is in scope after startedAt.
      // With --diff-filter=AM: type D is excluded → no .mts files → skip.
      assert.equal(result.simplifyRan, false);
      assert.equal(result.skipped, true);
      assert.equal(result.skipReason, "no-source-files");
    } finally {
      await fs.rm(testRepo, { recursive: true, force: true });
    }
  });

  it("dispatches code-simplifier agent and writes ceremony with simplifyRan:true", async () => {
    // Create a real .mts file and commit it so git log finds it
    await fs.writeFile(path.join(tmpDir, "test.mts"), "export const x = 1;\n");
    execFileSync("git", ["add", "test.mts"], { cwd: tmpDir });
    execFileSync("git", ["commit", "-m", "add test.mts"], { cwd: tmpDir });

    const dispatched: string[] = [];
    const mockDispatch = async (opts: any) => {
      dispatched.push(opts.agent);
      return { ok: true, skipped: false, durationMs: 50 };
    };
    const result = await featureSimplify(tmpDir, "FEAT-002", {
      skipSimplify: false,
      sliceId: "SLICE-02",
      dispatchFn: mockDispatch
    });
    assert.equal(result.simplifyRan, true);
    assert.equal(dispatched[0], "code-simplifier:code-simplifier");
    assert.ok(Array.isArray(result.files) && result.files.length > 0, "files should be non-empty");

    // Ceremony written to .claude/artifacts/crew/ceremonies/
    const ceremoniesDir = path.join(tmpDir, ".claude", "artifacts", "crew", "ceremonies");
    const files = await fs.readdir(ceremoniesDir).catch(() => [] as string[]);
    const ceremonyFile = files.find((f: string) => f.startsWith("feature-end-FEAT-002"));
    assert.ok(ceremonyFile, "ceremony file not written");
    const ceremony = JSON.parse(await fs.readFile(path.join(ceremoniesDir, ceremonyFile!), "utf8"));
    assert.equal(ceremony.simplifyRan, true);
  });
});
