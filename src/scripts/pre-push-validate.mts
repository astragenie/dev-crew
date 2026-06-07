#!/usr/bin/env node
// PreToolUse hook script: validates plugin manifests before git push.
// Reads tool input from stdin. Exits 0 to allow, 2 to block.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

let input = "";
for await (const chunk of process.stdin) input += chunk;

try {
  const data = JSON.parse(input);
  const cmd = data?.tool_input?.command || "";

  if (!/\bgit\s+push\b/.test(cmd)) {
    process.exit(0);
  }

  execFileSync("node", [path.join(scriptDir, "validate-manifests.mjs")], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync("node", [path.join(scriptDir, "validate-content-length.mjs")], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  // Prettier drift was undetected for several pushes; running format:check
  // here mirrors the CI gate so divergence blocks at git push, not in CI.
  execFileSync("npm", ["run", "format:check"], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32"
  });
  process.exit(0);
} catch (e) {
  const err = e as { stderr?: string; message?: string };
  process.stderr.write(
    `Plugin validation failed — fix before pushing:\n${err.stderr || err.message}\n`
  );
  process.exit(2);
}
