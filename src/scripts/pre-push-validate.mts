#!/usr/bin/env node
// PreToolUse hook script: validates plugin manifests before git commit and
// git push. Reads tool input from stdin. Always exits 0 — failures are
// surfaced as a Claude Code systemMessage so the operator sees the warning
// but the command proceeds. CI remains the hard gate.
//
// Two gates, escalating with the cost of the operation:
//   - git commit → manifest validation only (includes the version lockstep
//     check across plugin.json / marketplace.json / package.json).
//   - git push → manifest validation + content-length + prettier format:check
//     (mirrors CI). Also runs --check-generated in warn-only mode.

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
  const detail = (err.stderr || err.message || "unknown").toString().trim();
  const systemMessage = `loop pre-push validation failed (soft block — push proceeds, CI will enforce):\n${detail}`;
  process.stdout.write(
    JSON.stringify({
      continue: true,
      suppressOutput: true,
      systemMessage
    })
  );
  process.exit(0);
}
