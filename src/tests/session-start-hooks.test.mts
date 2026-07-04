import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import assert from "node:assert/strict";

// Tests for hooks/version-check.mjs and hooks/bootstrap-context.mjs —
// P1.8 review follow-up: pin the disabled-path (feature flag off -> exit 0,
// no output) for both SessionStart hooks, plus the version-check.mjs
// drift-warning-actually-fires acceptance criterion using a mocked
// ~/.claude tree (RUNNER_VERSION_CHECK_HOME override) since the real
// environment isn't reachable/stable in CI.

function resolveHookPath(name: string): string {
  return path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1")),
    "..",
    "hooks",
    name
  );
}

async function assertHookExists(name: string): Promise<string> {
  let hookPath = resolveHookPath(name);
  try {
    await fs.stat(hookPath);
    return hookPath;
  } catch {
    hookPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1")),
      "../..",
      "hooks",
      name
    );
    await fs.stat(hookPath);
    return hookPath;
  }
}

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeLoopConfig(repo: string, config: unknown): Promise<void> {
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repo, ".claude", "loop.json"), JSON.stringify(config, null, 2));
}

function runHook(
  hookPath: string,
  payload: Record<string, unknown>,
  extraEnv: Record<string, string> = {}
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: { ...process.env, ...extraEnv }
  });
  return { status: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
}

// --- bootstrap-context.mjs ---------------------------------------------

test("bootstrap-context: default (no loop.json) prints HARD RULES and exits 0", async () => {
  const hookPath = await assertHookExists("bootstrap-context.mjs");
  const repo = await tmpRepo("bc-default-");
  const result = runHook(hookPath, { cwd: repo });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /HARD RULES/);
  assert.match(result.stdout, /\/runner:start/);
});

test("bootstrap-context: features.bootstrap-context.enabled=false -> exit 0, no output", async () => {
  const hookPath = await assertHookExists("bootstrap-context.mjs");
  const repo = await tmpRepo("bc-disabled-");
  await writeLoopConfig(repo, { features: { "bootstrap-context": { enabled: false } } });
  const result = runHook(hookPath, { cwd: repo });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("bootstrap-context: features.bootstrap-context.enabled=true behaves like default", async () => {
  const hookPath = await assertHookExists("bootstrap-context.mjs");
  const repo = await tmpRepo("bc-explicit-true-");
  await writeLoopConfig(repo, { features: { "bootstrap-context": { enabled: true } } });
  const result = runHook(hookPath, { cwd: repo });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /HARD RULES/);
});

// --- version-check.mjs ---------------------------------------------------

test("version-check: features.version-check.enabled=false -> exit 0, no output at all", async () => {
  const hookPath = await assertHookExists("version-check.mjs");
  const repo = await tmpRepo("vc-disabled-");
  await writeLoopConfig(repo, { features: { "version-check": { enabled: false } } });
  const result = runHook(hookPath, { cwd: repo });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "", "disabled means the bun-version check itself never runs");
});

test("version-check: no ~/.claude/plugins tree reachable -> exits 0 quietly (fail-open)", async () => {
  const hookPath = await assertHookExists("version-check.mjs");
  const repo = await tmpRepo("vc-nofixture-");
  const emptyHome = await tmpRepo("vc-empty-home-");
  const result = runHook(hookPath, { cwd: repo }, { RUNNER_VERSION_CHECK_HOME: emptyHome });
  assert.equal(result.status, 0);
  assert.ok(
    !result.stdout.includes("installed v"),
    "no drift text without a plugin/marketplace fixture"
  );
});

async function writeMockedPluginHome(
  homeDir: string,
  installedVersion: string,
  marketplaceVersion: string
): Promise<void> {
  const pluginsDir = path.join(homeDir, ".claude", "plugins");
  const marketplaceDir = path.join(pluginsDir, "marketplaces", "astra", ".claude-plugin");
  await fs.mkdir(pluginsDir, { recursive: true });
  await fs.mkdir(marketplaceDir, { recursive: true });
  await fs.writeFile(
    path.join(pluginsDir, "installed_plugins.json"),
    JSON.stringify({
      plugins: {
        "runner@astra": [{ scope: "user", version: installedVersion }]
      }
    })
  );
  await fs.writeFile(
    path.join(marketplaceDir, "marketplace.json"),
    JSON.stringify({
      plugins: [{ name: "runner", version: marketplaceVersion }]
    })
  );
}

test("version-check: acceptance — cache 0.58.0 vs marketplace 0.60.0 fires the drift warning", async () => {
  const hookPath = await assertHookExists("version-check.mjs");
  const repo = await tmpRepo("vc-drift-");
  const fixtureHome = await tmpRepo("vc-drift-home-");
  await writeMockedPluginHome(fixtureHome, "0.58.0", "0.60.0");

  const result = runHook(hookPath, { cwd: repo }, { RUNNER_VERSION_CHECK_HOME: fixtureHome });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /runner plugin: installed v0\.58\.0 but marketplace lists v0\.60\.0/);
  assert.match(result.stdout, /\/plugin marketplace update astra/);
  assert.match(result.stdout, /\/plugin install runner@astra/);
});

test("version-check: installed version already current -> no drift warning", async () => {
  const hookPath = await assertHookExists("version-check.mjs");
  const repo = await tmpRepo("vc-nodrift-");
  const fixtureHome = await tmpRepo("vc-nodrift-home-");
  await writeMockedPluginHome(fixtureHome, "0.60.0", "0.60.0");

  const result = runHook(hookPath, { cwd: repo }, { RUNNER_VERSION_CHECK_HOME: fixtureHome });
  assert.equal(result.status, 0);
  assert.ok(!result.stdout.includes("installed v"));
});

test("version-check: mocked home + features.version-check disabled -> gate wins, no drift text even though drift exists", async () => {
  const hookPath = await assertHookExists("version-check.mjs");
  const repo = await tmpRepo("vc-gate-wins-");
  await writeLoopConfig(repo, { features: { "version-check": { enabled: false } } });
  const fixtureHome = await tmpRepo("vc-gate-wins-home-");
  await writeMockedPluginHome(fixtureHome, "0.58.0", "0.60.0");

  const result = runHook(hookPath, { cwd: repo }, { RUNNER_VERSION_CHECK_HOME: fixtureHome });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});
