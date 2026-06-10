import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const LOOP = path.resolve("src/scripts/loop.mts");

test("backlog add honors loop.json backlogRoot override", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "loop-cfg-"));
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({ schemaVersion: 1, loop: { backlogRoot: "docs/backlog" } })
    );

    // Try to run backlog add; tolerate github-sync errors (non-fatal for this test)
    try {
      await run("bun", [LOOP, "backlog", "add", "--repo", repo, "--title", "T1"]);
    } catch (err: any) {
      // Non-zero exit is ok if it's from github-sync; the file should still exist
      if (!err.stderr?.includes("github") && !err.stderr?.includes("sync")) {
        throw err;
      }
    }

    const created = await fs.readdir(path.join(repo, "docs", "backlog", "pending"));
    assert.ok(
      created.some((f) => /^FEAT-\d+\.md$/.test(f)),
      `expected FEAT file in configured root, found: ${created.join(",")}`
    );

    const defaultRoot = path.join(repo, ".claude", "artifacts", "loop", "backlog");
    const defaultExists = await fs.access(defaultRoot).then(
      () => true,
      () => false
    );
    assert.equal(defaultExists, false, "default root must not be created when overridden");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("no module outside loop.mts imports resolveConfig for direct use", async () => {
  const libDir = path.resolve("src/scripts/lib");
  const offenders: string[] = [];

  for (const f of await fs.readdir(libDir)) {
    if (!f.endsWith(".mts") || f === "config-resolver.mts") continue;

    const text = await fs.readFile(path.join(libDir, f), "utf8");

    // Check for direct import of resolveConfig in lib modules
    // (they should accept it as a param instead)
    // Broader regex catches resolveConfig among multi-name imports
    const hasImport =
      /import\s*\{[^}]*\bresolveConfig\b[^}]*\}\s*from\s+["']\.\/config-resolver\.mjs["']/.test(
        text
      );
    const hasUsage = /resolveConfig\s*\(/.test(text);

    // Allowlist: functions that accept config as optional param but may fall back to resolveConfig
    // (only for backward compat when called from non-dispatcher contexts)
    const allowlist = [
      "artifact-linkage.mts", // already accepts config param with fallback
      "reviewer-ladder.mts", // already accepts config param with fallback
      "phase-gate.mts", // accepts config in options with fallback for standalone use
      "loop-installer.mts", // install-time resolution with preset merge — runs before loop.json exists; dispatcher config is not equivalent
      "doctor.mts" // param-with-fallback: doctor diagnoses config drift itself and must run standalone
    ];

    if (hasImport && hasUsage && !allowlist.includes(f)) {
      offenders.push(f);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `lib modules must take config as a param (not import resolveConfig): ${offenders.join(",")}`
  );
});

test("path-bearing commands receive config from dispatcher context", async () => {
  const src = await fs.readFile(path.resolve("src/scripts/loop.mts"), "utf8");
  for (const name of ["backlog", "slice", "spec", "decisions", "release", "feature"]) {
    const re = new RegExp(String.raw`\b${name}:\s*(?:async\s*)?\(\{[^}]*\bconfig\b[^}]*\}`);
    assert.ok(re.test(src), `COMMANDS.${name} must destructure config`);
  }
});
