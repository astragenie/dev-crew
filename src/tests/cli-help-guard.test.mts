// src/tests/cli-help-guard.test.mts
//
// FEAT-020 / SLICE-37 regression. `install --help` used to fall through to
// installLoop() and execute a real install: parseArgs (cli-args.mts) already
// resolved flags.help === true correctly, but loop.mts's dispatch never
// checked it before calling the handler. Observed live during SLICE-31
// against this repo's own working tree (CLAUDE.md and other tracked files
// were rewritten; reverted by hand). These tests exercise the real CLI entry
// point as a subprocess, not parseArgs directly and not an imported handler
// — loop.mts invokes main() unconditionally at module load (see the header
// comment in loop.mts), so importing it from a test would run the CLI
// against the test runner's own argv.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { LOOP_CLI, initGitRepo, makeTmpRepo } from "./_fixtures.mjs";

function run(args: string[]) {
  return spawnSync("bun", [LOOP_CLI, ...args], { encoding: "utf8" });
}

// Recursively list files under `dir`, excluding `.git`. Asserting against
// this (rather than a hardcoded list of installLoop's known write targets)
// keeps the "zero writes" claim honest even if installLoop's write set
// changes later.
async function listNonGitFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        out.push(full);
      }
    }
  }
  await walk(dir);
  return out.sort();
}

describe("loop.mts CLI --help guard (FEAT-020 / SLICE-37)", () => {
  test("install --help prints usage, exits 0, and writes zero files", async () => {
    const repo = await makeTmpRepo("cli-help-install-");
    await initGitRepo(repo);
    expect(await listNonGitFiles(repo)).toEqual([]);

    // --preset supplied so installLoop() would have a valid config to write
    // if the guard were absent — a bare `install --help` with no preset can
    // no-op for an unrelated reason (missing config) and would prove nothing.
    const r = run(["install", "--help", "--preset", "typescript-plugin-dev", "--repo", repo]);

    expect(r.status).toBe(0);
    expect(`${r.stdout}${r.stderr}`.toLowerCase()).toContain("install");

    expect(await listNonGitFiles(repo)).toEqual([]);
  });

  test("install --bogus-flag exits non-zero and writes zero files", async () => {
    const repo = await makeTmpRepo("cli-help-install-bogus-");
    await initGitRepo(repo);
    expect(await listNonGitFiles(repo)).toEqual([]);

    const r = run(["install", "--bogus-flag", "--preset", "typescript-plugin-dev", "--repo", repo]);

    expect(r.status).not.toBe(0);

    expect(await listNonGitFiles(repo)).toEqual([]);
  });

  test("backlog --help proves the dispatch-level chokepoint covers subcommands beyond install", async () => {
    const repo = await makeTmpRepo("cli-help-backlog-");
    await initGitRepo(repo);

    const r = run(["backlog", "--help", "--repo", repo]);

    expect(r.status).toBe(0);
    expect(`${r.stdout}${r.stderr}`.toLowerCase()).toContain("backlog");

    expect(await listNonGitFiles(repo)).toEqual([]);
  });
});
