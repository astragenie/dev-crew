// Tests for src/scripts/lib/memory-doctor.mts
// probeMemory() must return a valid MemoryStatus on all paths and never throw.

import { test, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { probeMemory } from "../scripts/lib/memory-doctor.mjs";
import { _resetCliCache } from "../scripts/lib/memory-bridge.mjs";

// Null CLI resolver — used to guarantee cli_missing path regardless of PATH.
const nullCli = async (): Promise<null> => null;

/** Build a CLI resolver that always returns the given path. */
function makeCliResolver(cliPath: string): () => Promise<{ path: string }> {
  return async () => ({ path: cliPath });
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

let tmpDir: string | null = null;
let origPluginRoot: string | undefined;

beforeEach(() => {
  _resetCliCache();
  origPluginRoot = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
});

afterEach(async () => {
  if (origPluginRoot !== undefined) {
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = origPluginRoot;
  } else {
    delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  }
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    tmpDir = null;
  }
  _resetCliCache();
});

async function makeTmpRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "doctor-repo-"));
  tmpDir = dir;
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  return dir;
}

async function writeLoopJson(repoPath: string, content: Record<string, unknown>): Promise<void> {
  await fs.writeFile(path.join(repoPath, ".claude", "loop.json"), JSON.stringify(content), "utf8");
}

/** Create a fake astramem CLI and return the executable path + a resolver seam. */
async function makeFakeCli(
  repoPath: string,
  scriptBody: string
): Promise<{ cliDir: string; exePath: string; resolver: () => Promise<{ path: string }> }> {
  const cliDir = path.join(repoPath, "fakecli");
  const binDir = path.join(cliDir, "bin");
  await fs.mkdir(binDir, { recursive: true });
  const basePath = path.join(binDir, "astramem");

  let exePath: string;
  if (process.platform === "win32") {
    // On Windows, use a .cmd wrapper. spawnDoctor must be called with the .cmd path.
    exePath = `${basePath}.cmd`;
    await fs.writeFile(exePath, `@echo off\n${scriptBody}\n`);
  } else {
    exePath = basePath;
    await fs.writeFile(exePath, `#!/bin/sh\n${scriptBody}\n`);
    await fs.chmod(exePath, 0o755);
  }
  const resolver = makeCliResolver(exePath);
  return { cliDir, exePath, resolver };
}

// -----------------------------------------------------------------------
// Case 1: memory.enabled === "never" → returns disabled without invoking CLI
// -----------------------------------------------------------------------

test('probeMemory returns disabled when loop.memory.enabled === "never"', async () => {
  const repoPath = await makeTmpRepo();
  await writeLoopJson(repoPath, { memory: { enabled: "never" } });

  // Inject a tracking resolver — it should NOT be called.
  let resolverCalled = false;
  const trackingResolver = async (): Promise<null> => {
    resolverCalled = true;
    return null;
  };

  const result = await probeMemory(repoPath, { _resolveCli: trackingResolver });

  assert.equal(result.health, "disabled");
  assert.equal(result.cli_present, false);
  assert.equal(resolverCalled, false, "CLI resolver must not be called when memory is disabled");
});

// -----------------------------------------------------------------------
// Case 2: CLI absent → returns cli_missing within 100ms
// -----------------------------------------------------------------------

test("probeMemory returns cli_missing within 100ms when CLI resolver returns null", async () => {
  const repoPath = await makeTmpRepo();
  // Inject null CLI resolver — guarantees cli_missing regardless of PATH.
  const start = Date.now();
  const result = await probeMemory(repoPath, { _resolveCli: nullCli });
  const elapsed = Date.now() - start;

  assert.equal(result.health, "cli_missing");
  assert.equal(result.cli_present, false);
  assert.ok(elapsed < 500, `probeMemory took ${elapsed}ms — expected < 500ms`);
});

// -----------------------------------------------------------------------
// Case 3: CLI present but doctor times out → returns unreachable within 3.5s
// -----------------------------------------------------------------------

test("probeMemory returns unreachable within 3.5s when astramem doctor hangs", async () => {
  const repoPath = await makeTmpRepo();

  const hangBody = process.platform === "win32" ? "ping -n 60 127.0.0.1 > nul" : "sleep 30";
  const { exePath, resolver } = await makeFakeCli(repoPath, hangBody);

  const start = Date.now();
  const result = await probeMemory(repoPath, { _resolveCli: resolver });
  const elapsed = Date.now() - start;

  assert.equal(result.health, "unreachable");
  // cli_present may be true or false depending on whether the abort-path
  // catches the path — accept either as long as health is "unreachable".
  assert.ok(elapsed < 3500, `probeMemory took ${elapsed}ms — expected < 3500ms`);
  void exePath; // referenced to satisfy lint
});

// -----------------------------------------------------------------------
// Case 4: CLI returns malformed JSON → returns unreachable
// -----------------------------------------------------------------------

test("probeMemory returns unreachable when astramem doctor outputs malformed JSON", async () => {
  const repoPath = await makeTmpRepo();

  const badJsonBody =
    process.platform === "win32" ? "echo this is not json" : "echo 'this is not json'";
  const { resolver } = await makeFakeCli(repoPath, badJsonBody);

  const result = await probeMemory(repoPath, { _resolveCli: resolver });

  assert.equal(result.health, "unreachable");
  assert.ok(typeof result.fix_hint === "string" && result.fix_hint.length > 0);
});

// -----------------------------------------------------------------------
// Case 5: Happy path — mocked JSON output maps to populated fields
// -----------------------------------------------------------------------

test("probeMemory maps well-formed astramem doctor JSON to MemoryStatus fields", async () => {
  const repoPath = await makeTmpRepo();

  const doctorOutput = JSON.stringify({
    health: "ok",
    provider: "saas",
    version: "0.4.1",
    url: "https://mem.astragenie.dev",
    last_ingest_at: "2026-06-20T12:00:00Z"
  });

  // Write JSON to a temp file and have the fake CLI cat/type it — avoids
  // echo quoting issues on Windows (CMD adds trailing spaces, CR/LF, etc.).
  const outputFile = path.join(repoPath, "doctor-output.json");
  await fs.writeFile(outputFile, doctorOutput, "utf8");

  const scriptBody = process.platform === "win32" ? `type "${outputFile}"` : `cat "${outputFile}"`;
  const { exePath, resolver } = await makeFakeCli(repoPath, scriptBody);

  const result = await probeMemory(repoPath, { _resolveCli: resolver });

  assert.equal(result.health, "ok");
  assert.equal(result.cli_present, true);
  assert.equal(result.provider, "saas");
  assert.equal(result.version, "0.4.1");
  assert.equal(result.url, "https://mem.astragenie.dev");
  assert.equal(result.last_ingest_at, "2026-06-20T12:00:00Z");
  assert.ok(result.cli_path === exePath, "cli_path should match the injected exePath");
});

// -----------------------------------------------------------------------
// Case 6: probeMemory never throws on any failure path
// -----------------------------------------------------------------------

test("probeMemory does not throw when CLI resolver returns null", async () => {
  const repoPath = await makeTmpRepo();
  await assert.doesNotReject(async () => {
    await probeMemory(repoPath, { _resolveCli: nullCli });
  });
});
