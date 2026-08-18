// Tests for FEAT-130 / SLICE-119: stuck-detector check function.
import { test, describe, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkStuckDetector } from "../scripts/lib/stuck-detector.mjs";

const STUCK_REL = path.join(".claude", "state", "loop", "stuck-detector.json");

async function makeTempRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeStuckFile(repoPath: string, content: unknown): Promise<void> {
  const dir = path.join(repoPath, ".claude", "state", "loop");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(repoPath, STUCK_REL), JSON.stringify(content), "utf8");
}

describe("checkStuckDetector", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTempRepo("stuck-test-");
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("returns null when stuck-detector.json absent", async () => {
    assert.equal(await checkStuckDetector(tmpDir), null);
  });

  test("returns null on malformed JSON", async () => {
    const dir = path.join(tmpDir, ".claude", "state", "loop");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(tmpDir, STUCK_REL), "{ not json }", "utf8");
    assert.equal(await checkStuckDetector(tmpDir), null);
  });

  test("returns null when attempts missing (invalid shape)", async () => {
    await writeStuckFile(tmpDir, { sliceId: "SLICE-119" });
    assert.equal(await checkStuckDetector(tmpDir), null);
  });

  test("returns null when attempts < threshold (default 3)", async () => {
    await writeStuckFile(tmpDir, {
      sliceId: "SLICE-119",
      attempts: 2,
      lastAttemptAt: new Date().toISOString()
    });
    assert.equal(await checkStuckDetector(tmpDir), null);
  });

  test("returns signal when attempts >= threshold (default 3)", async () => {
    const lastAttemptAt = new Date().toISOString();
    await writeStuckFile(tmpDir, { sliceId: "SLICE-119", attempts: 3, lastAttemptAt });
    const result = await checkStuckDetector(tmpDir);
    assert.ok(result !== null);
    assert.equal(result!.sliceId, "SLICE-119");
    assert.equal(result!.attempts, 3);
    assert.equal(result!.threshold, 3);
    assert.equal(result!.lastAttemptAt, lastAttemptAt);
  });

  test("returns null when file content is a JSON array", async () => {
    await writeStuckFile(tmpDir, [{ sliceId: "SLICE-119", attempts: 5 }]);
    assert.equal(await checkStuckDetector(tmpDir), null);
  });

  test("returns signal when attempts > threshold", async () => {
    await writeStuckFile(tmpDir, {
      sliceId: "SLICE-100",
      attempts: 7,
      lastAttemptAt: new Date().toISOString()
    });
    const result = await checkStuckDetector(tmpDir);
    assert.ok(result !== null);
    assert.equal(result!.attempts, 7);
  });
});
