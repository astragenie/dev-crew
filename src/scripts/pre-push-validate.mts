#!/usr/bin/env node
// PreToolUse hook script: validates plugin manifests before git commit and
// git push. Reads tool input from stdin. Exits 0 to allow, 2 to block.
//
// Two gates, escalating with the cost of the operation:
//   - git commit → manifest validation only (includes the version lockstep
//     check across plugin.json / marketplace.json / package.json). This is
//     the earliest point version drift can be caught. Recurring root cause of
//     drift: hand-editing one manifest and forgetting the others — always use
//     `bun run bump-version <v>` to bump all three in lockstep.
//   - git push → manifest validation + content-length + prettier format:check
//     (the full pre-push gate, mirrors CI). Also runs --check-generated in
//     warn-only mode to detect drift in auto-generated artifacts.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

// --check-generated: generate expected snapshot content in-memory and diff
// against the on-disk file. Returns true if up to date, false if drift found.
async function checkGeneratedArtifacts(repoPath: string): Promise<boolean> {
  const { generateSnapshotContent } = await import("./lib/memory-snapshot.mjs");
  const { snapshotPath } = await import("./lib/paths.mjs");

  const target = snapshotPath(repoPath, null);
  const today = new Date().toISOString().slice(0, 10);

  let onDisk: string;
  try {
    onDisk = await fs.readFile(target, "utf8");
  } catch {
    process.stderr.write(`  warning: loop-snapshot.md not found at ${target}\n`);
    return false;
  }

  const expected = await generateSnapshotContent(repoPath, { today });
  if (onDisk === expected) return true;

  process.stderr.write(`  warning: loop-snapshot.md is out of date.\n`);
  process.stderr.write(`  Run: bun src/scripts/loop.mts snapshot-memory --repo <path>\n`);
  return false;
}

const args = process.argv.slice(2);
const checkGeneratedFlag = args.includes("--check-generated");

if (checkGeneratedFlag) {
  const repoPath = process.cwd();
  const upToDate = await checkGeneratedArtifacts(repoPath);
  if (upToDate) {
    process.stdout.write("✓ generated artifacts up to date\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

let input = "";
for await (const chunk of process.stdin) input += chunk;

try {
  const data = JSON.parse(input);
  const cmd = data?.tool_input?.command || "";

  const isPush = /\bgit\s+push\b/.test(cmd);
  const isCommit = /\bgit\s+commit\b/.test(cmd);

  if (!isPush && !isCommit) {
    process.exit(0);
  }

  // Manifest validation (version lockstep + schema) runs on BOTH commit and
  // push, so version drift is blocked at the commit gate, not just at push.
  execFileSync("bun", [path.join(scriptDir, "validate-manifests.mts")], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32"
  });

  if (isPush) {
    execFileSync("bun", [path.join(scriptDir, "validate-content-length.mts")], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32"
    });
    // Prettier drift was undetected for several pushes; running format:check
    // here mirrors the CI gate so divergence blocks at git push, not in CI.
    execFileSync("bun", ["run", "format:check"], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32"
    });
    // Warn-only: detect drift in auto-generated artifacts without blocking push.
    // A future slice will flip this to blocking (exit 2 on drift).
    const repoPath = process.cwd();
    await checkGeneratedArtifacts(repoPath).catch(() => {
      /* ignore errors so push is never blocked by a generator failure */
    });
  }
  process.exit(0);
} catch (e) {
  const err = e as { stderr?: string; message?: string };
  process.stderr.write(
    `Plugin validation failed — fix before git commit/push:\n${err.stderr || err.message}\n`
  );
  process.exit(2);
}
