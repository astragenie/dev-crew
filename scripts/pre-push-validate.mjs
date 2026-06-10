#!/usr/bin/env node
// PreToolUse hook script: validates plugin manifests before git commit and
// git push. Reads tool input from stdin. Exits 0 to allow, 2 to block.
//
// Two gates, escalating with the cost of the operation:
//   - git commit → manifest validation only (includes the version lockstep
//     check across plugin.json / marketplace.json / package.json). This is
//     the earliest point version drift can be caught. Recurring root cause of
//     drift: hand-editing one manifest and forgetting the others — always use
//     `npm run bump-version <v>` to bump all three in lockstep.
//   - git push → manifest validation + content-length + prettier format:check
//     (the full pre-push gate, mirrors CI).
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
let input = "";
for await (const chunk of process.stdin)
    input += chunk;
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
    execFileSync("node", [path.join(scriptDir, "validate-manifests.mjs")], {
        stdio: ["ignore", "pipe", "pipe"]
    });
    if (isPush) {
        execFileSync("node", [path.join(scriptDir, "validate-content-length.mjs")], {
            stdio: ["ignore", "pipe", "pipe"]
        });
        // Prettier drift was undetected for several pushes; running format:check
        // here mirrors the CI gate so divergence blocks at git push, not in CI.
        execFileSync("npm", ["run", "format:check"], {
            stdio: ["ignore", "pipe", "pipe"],
            shell: process.platform === "win32"
        });
    }
    process.exit(0);
}
catch (e) {
    const err = e;
    process.stderr.write(`Plugin validation failed — fix before git commit/push:\n${err.stderr || err.message}\n`);
    process.exit(2);
}
