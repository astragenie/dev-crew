// FEAT-128 / SLICE-118: Pause / resume conversation lifecycle.
// Tests for checkPausedForExternalEvent (fail-open behaviour, valid signal,
// invalid JSON, missing triggered field, and round-trip with pause subcommand).

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "bun:test";

import { checkPausedForExternalEvent } from "../scripts/lib/paused-for-external-event.mjs";

const PAUSED_REL = path.join(".claude", "state", "loop", "paused.json");
const RESUME_HINT = "Run: bun src/scripts/loop.mts resume --repo .";

async function makeTempRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writePausedFile(repoPath: string, content: unknown): Promise<void> {
  const dir = path.join(repoPath, ".claude", "state", "loop");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(repoPath, PAUSED_REL), JSON.stringify(content), "utf8");
}

describe("checkPausedForExternalEvent", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTempRepo("pfee-test-");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("returns null when paused.json is absent", async () => {
    const result = await checkPausedForExternalEvent(tmpDir);
    assert.equal(result, null);
  });

  test("returns signal when file has valid JSON with triggered: true", async () => {
    const pausedAt = new Date().toISOString();
    await writePausedFile(tmpDir, {
      triggered: true,
      reason: "waiting for CI to pass",
      resumeHint: RESUME_HINT,
      pausedAt
    });
    const result = await checkPausedForExternalEvent(tmpDir);
    assert.ok(result !== null, "signal must not be null for valid file");
    assert.equal(result!.triggered, true);
    assert.equal(result!.reason, "waiting for CI to pass");
    assert.equal(result!.resumeHint, RESUME_HINT);
    assert.equal(result!.pausedAt, pausedAt);
  });

  test("returns null on malformed JSON", async () => {
    const dir = path.join(tmpDir, ".claude", "state", "loop");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(tmpDir, PAUSED_REL), "{ not valid json }", "utf8");
    const result = await checkPausedForExternalEvent(tmpDir);
    assert.equal(result, null);
  });

  test("returns null when triggered field is missing", async () => {
    await writePausedFile(tmpDir, {
      reason: "waiting for PR review",
      resumeHint: RESUME_HINT,
      pausedAt: new Date().toISOString()
    });
    const result = await checkPausedForExternalEvent(tmpDir);
    assert.equal(result, null);
  });

  test("returns null when triggered is false", async () => {
    await writePausedFile(tmpDir, {
      triggered: false,
      reason: "not really paused",
      resumeHint: RESUME_HINT,
      pausedAt: new Date().toISOString()
    });
    const result = await checkPausedForExternalEvent(tmpDir);
    assert.equal(result, null);
  });

  test("file written by pause subcommand shape is readable by checkPausedForExternalEvent", async () => {
    // Simulate what the pause subcommand writes.
    const reason = "deploy gate pending";
    const pausedAt = new Date().toISOString();
    const payload = {
      triggered: true as const,
      reason,
      resumeHint: RESUME_HINT,
      pausedAt
    };
    await writePausedFile(tmpDir, payload);
    const result = await checkPausedForExternalEvent(tmpDir);
    assert.ok(result !== null, "signal must not be null for valid file");
    assert.equal(result!.triggered, true);
    assert.equal(result!.reason, reason);
    assert.equal(result!.pausedAt, pausedAt);
  });

  test("returns null when file content is a JSON array (not an object)", async () => {
    await writePausedFile(tmpDir, [{ triggered: true }]);
    const result = await checkPausedForExternalEvent(tmpDir);
    assert.equal(result, null);
  });

  test("returns null when file content is a JSON null", async () => {
    const dir = path.join(tmpDir, ".claude", "state", "loop");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(tmpDir, PAUSED_REL), "null", "utf8");
    const result = await checkPausedForExternalEvent(tmpDir);
    assert.equal(result, null);
  });
});
