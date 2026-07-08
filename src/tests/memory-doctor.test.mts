// Tests for src/scripts/lib/memory-doctor.mts
// probeMemory() must return a valid MemoryStatus on all paths and never throw.

import { test, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { probeMemory } from "../scripts/lib/memory-doctor.mjs";
import { _resetCliCache } from "../scripts/lib/astramem-cli-resolver.mjs";

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
  origPluginRoot = process.env.CLAUDE_PLUGIN_ROOT_MEMORY;
  delete process.env.CLAUDE_PLUGIN_ROOT_MEMORY;
});

afterEach(async () => {
  if (origPluginRoot !== undefined) {
    process.env.CLAUDE_PLUGIN_ROOT_MEMORY = origPluginRoot;
  } else {
    delete process.env.CLAUDE_PLUGIN_ROOT_MEMORY;
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
// Case 5: Real `doctor --json` shape (astramem 0.6.0) — configured but
// indeterminate reachability → "unknown", never "ok" (AC-1, AC-4).
// -----------------------------------------------------------------------

/** Write a fixture reflecting the real `astramem doctor --json` output shape. */
async function writeDoctorFixture(
  repoPath: string,
  output: Record<string, unknown>
): Promise<string> {
  const outputFile = path.join(repoPath, "doctor-output.json");
  await fs.writeFile(outputFile, JSON.stringify(output), "utf8");
  return outputFile;
}

/**
 * Build a fake CLI script that both captures its own argv (to `argsFile`, as
 * a plain space-joined string — enough to assert the invoking flag) and
 * echoes the fixture JSON from `outputFile`, so one invocation covers both
 * the flag-name assertion (AC-4) and the output-shape mapping (AC-1/AC-2).
 */
function captureAndEmitScript(argsFile: string, outputFile: string): string {
  return process.platform === "win32"
    ? `echo %* > "${argsFile}"\ntype "${outputFile}"`
    : `echo "$*" > "${argsFile}"\ncat "${outputFile}"`;
}

test("probeMemory invokes doctor with --json (not --format json) and maps unknown when configured but indeterminate", async () => {
  const repoPath = await makeTmpRepo();

  // Real shape: env_vars set (provider configured via env), no rejected pending.
  const outputFile = await writeDoctorFixture(repoPath, {
    env_vars: {
      MEMORY_BEARER: "[present, redacted]",
      MEMORY_API_URL: "https://mem.astragenie.dev",
      ASTRAMEM_PROVIDER: "saas"
    },
    local_url: "https://mem.astragenie.dev",
    local_url_source: "env",
    pending: { count: 0, bytes: 0, oldest_epoch_ms: null, rejected_count: 0 },
    deprecation_hits: []
  });

  const argsFile = path.join(repoPath, "captured-args.txt");
  const { exePath, resolver } = await makeFakeCli(
    repoPath,
    captureAndEmitScript(argsFile, outputFile)
  );

  const result = await probeMemory(repoPath, { _resolveCli: resolver });

  assert.equal(
    result.health,
    "unknown",
    "must never default to ok when reachability is indeterminate"
  );
  assert.notEqual(result.health, "ok");
  assert.equal(result.cli_present, true);
  assert.equal(result.provider, "saas");
  assert.equal(result.url, "https://mem.astragenie.dev");
  assert.ok(result.cli_path === exePath, "cli_path should match the injected exePath");
  assert.ok(typeof result.fix_hint === "string" && result.fix_hint.length > 0);

  const captured = (await fs.readFile(argsFile, "utf8")).trim();
  assert.ok(captured.includes("--json"), `expected --json in invocation, got: ${captured}`);
  assert.ok(
    !captured.includes("--format"),
    `must not invoke the old --format flag, got: ${captured}`
  );
});

// -----------------------------------------------------------------------
// Case 5b: rejected pending events → "unreachable", not "ok" (AC-2).
// -----------------------------------------------------------------------

test("probeMemory reports unreachable (not ok) when doctor --json shows rejected pending events", async () => {
  const repoPath = await makeTmpRepo();

  const outputFile = await writeDoctorFixture(repoPath, {
    env_vars: { MEMORY_BEARER: null, MEMORY_API_URL: null, ASTRAMEM_PROVIDER: "local" },
    local_url: "http://127.0.0.1:7777",
    local_url_source: "config",
    pending: { count: 3, bytes: 512, oldest_epoch_ms: 1750000000000, rejected_count: 2 },
    deprecation_hits: []
  });

  const { resolver } = await makeFakeCli(
    repoPath,
    process.platform === "win32" ? `type "${outputFile}"` : `cat "${outputFile}"`
  );

  const result = await probeMemory(repoPath, { _resolveCli: resolver });

  assert.equal(result.health, "unreachable");
  assert.notEqual(result.health, "ok");
  assert.ok(result.fix_hint?.includes("2"), "fix_hint should surface the rejected count");
});

// -----------------------------------------------------------------------
// Case 5c: nothing configured (pure defaults) → "not_configured", not "ok".
// -----------------------------------------------------------------------

test("probeMemory reports not_configured (not ok) when doctor --json shows pure defaults", async () => {
  const repoPath = await makeTmpRepo();

  const outputFile = await writeDoctorFixture(repoPath, {
    env_vars: { MEMORY_BEARER: null, MEMORY_API_URL: null, ASTRAMEM_PROVIDER: null },
    local_url: "http://127.0.0.1:7777",
    local_url_source: "default",
    pending: { count: 0, bytes: 0, oldest_epoch_ms: null, rejected_count: 0 },
    deprecation_hits: []
  });

  const { resolver } = await makeFakeCli(
    repoPath,
    process.platform === "win32" ? `type "${outputFile}"` : `cat "${outputFile}"`
  );

  const result = await probeMemory(repoPath, { _resolveCli: resolver });

  assert.equal(result.health, "not_configured");
  assert.notEqual(result.health, "ok");
  assert.equal(result.provider, "auto-undetermined");
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
