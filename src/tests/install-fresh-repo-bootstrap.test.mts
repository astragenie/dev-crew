// Regression for runner-plugin#364 — the dispatcher pre-resolved config for
// EVERY command before the handler ran (loop.mts), so `install` (whose handler
// never reads config and must bootstrap a fresh repo) failed on a repo with no
// `.claude/loop.json`: resolveConfig() throws by design (DEC-069) when no
// config exists. The fix skips the dispatcher-level resolve for
// CONFIG_OPTIONAL_COMMANDS (install / list-presets). These tests exercise the
// real CLI dispatcher as a subprocess so they cover the dispatcher path, not
// just installLoop().
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { LOOP_CLI, makeTmpRepo } from "./_fixtures.mjs";

const run = promisify(execFile);

test("install on a fresh repo is not blocked by the dispatcher config throw (#364)", async () => {
  const repo = await makeTmpRepo("issue-364-install-"); // .claude/ exists, loop.json does NOT
  try {
    await run("git", ["init", repo]); // installLoop requires a git repo
    const configPath = path.join(repo, ".claude", "loop.json");
    const before = await fs.access(configPath).then(
      () => true,
      () => false
    );
    assert.equal(before, false, "precondition: fresh repo must have no loop.json");

    // Before the fix this rejected with the DEC-069 "No .claude/loop.json found
    // ... Run /runner:install --preset <name> first" error, thrown by the
    // dispatcher-level resolveConfig BEFORE the install handler ever ran. The
    // fix skips that pre-resolve for install, so the command reaches installLoop.
    let ok = false;
    let stderr = "";
    try {
      await run("bun", [LOOP_CLI, "install", "--repo", repo, "--preset", "typescript-plugin-dev"]);
      ok = true;
    } catch (err: any) {
      stderr = String(err.stderr ?? err.stdout ?? err.message ?? "");
    }

    // Core regression assertion: the dispatcher no longer short-circuits install
    // with the config-not-found throw. Install may still fail DOWNSTREAM for
    // environment reasons that are NOT this bug — notably installLoop's hard
    // crew-plugin dependency gate on a runner without crew cached (CI). That is
    // acceptable; we only assert the #364 throw is gone.
    assert.doesNotMatch(
      stderr,
      /No .*loop\.json found|Run `?\/runner:install/i,
      `install must not hit the dispatcher config-not-found throw; stderr was: ${stderr}`
    );

    // When the environment can complete install (crew present, e.g. local dev),
    // loop.json is written. When it can't (CI, no crew), install fails at the
    // later crew gate — never the config throw asserted above.
    if (ok) {
      const after = await fs.access(configPath).then(
        () => true,
        () => false
      );
      assert.equal(after, true, "successful install must write .claude/loop.json on a fresh repo");
    }
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("list-presets runs on a fresh repo with no .claude/loop.json", async () => {
  const repo = await makeTmpRepo("issue-364-list-");
  try {
    // list-presets is static and never reads config; it must not be blocked by
    // the dispatcher's fresh-repo config throw.
    const { stdout } = await run("bun", [LOOP_CLI, "list-presets", "--repo", repo]);
    const parsed = JSON.parse(stdout);
    assert.ok(Array.isArray(parsed.presets) && parsed.presets.length > 0, "presets listed");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("a config-reading command still fails clearly on a fresh repo (DEC-069 preserved)", async () => {
  const repo = await makeTmpRepo("issue-364-guard-");
  try {
    // The fix must NOT weaken DEC-069 for normal commands: a command whose
    // handler consumes dispatcher config must still get the clear "not
    // installed yet" error on a repo with no loop.json.
    await assert.rejects(
      run("bun", [LOOP_CLI, "status", "--repo", repo]),
      (err: any) => /loop\.json/.test(String(err.stderr ?? err.stdout ?? err.message)),
      "config-reading command should still fail clearly when no loop.json exists"
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
