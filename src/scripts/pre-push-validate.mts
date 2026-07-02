#!/usr/bin/env node
// PreToolUse hook script: validates plugin manifests before git commit and
// git push. Reads tool input from stdin. Always exits 0 — failures are
// surfaced as a Claude Code systemMessage so the operator sees the warning
// but the command proceeds. CI is the hard gate (see .github/workflows/ci.yml
// and src/scripts/validate-snapshot-freshness.mts, which is what actually
// blocks a stale loop-snapshot.md from merging — FEAT-208).
//
// Two gates, escalating with the cost of the operation:
//   - git commit → manifest validation only (includes the version lockstep
//     check across plugin.json / marketplace.json / package.json).
//   - git push → manifest validation + content-length + prettier format:check
//     (mirrors CI). Also runs the snapshot-freshness check in warn-only mode.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { validateSnapshotFreshness } from "./validate-snapshot-freshness.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const checkGeneratedFlag = args.includes("--check-generated");

if (checkGeneratedFlag) {
  const repoPath = process.cwd();
  const result = await validateSnapshotFreshness(repoPath);
  if (result.ok) {
    process.stdout.write("✓ generated artifacts up to date\n");
    process.exit(0);
  } else {
    for (const e of result.errors) process.stderr.write(`  warning: ${e}\n`);
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
    // Warn-only: detect drift in the loop-snapshot without blocking push.
    // CI (validate-snapshot-freshness.mts) is the hard gate.
    const repoPath = process.cwd();
    const freshness = await validateSnapshotFreshness(repoPath).catch(() => ({
      ok: true,
      errors: [] as string[]
      /* ignore errors so push is never blocked by a generator failure */
    }));
    if (!freshness.ok) {
      for (const e of freshness.errors) process.stderr.write(`  warning: ${e}\n`);
    }
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
