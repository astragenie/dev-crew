// Runtime guard for CLI entry points whose internal module graph uses
// `.mjs` import specifiers that only Bun's resolver maps to sibling
// `.mts` source files (Node's ESM resolver requires an exact extension
// match). See astragenie/runner-plugin#389.
//
// Call `ensureBunRuntime()` before any other import (static or dynamic)
// of this CLI's internal `.mjs`-specifier modules. Under Bun it is a
// no-op. Under Node it re-execs the same entry file under `bun`
// (inheriting stdio) and never returns — it either exits with `bun`'s
// status or, if `bun` isn't on PATH, prints an actionable message and
// exits 1.
//
// Must stay a real, self-contained .mjs file (Node builtins only): it
// is itself a static import in every guarded entry point, so it has to
// resolve correctly under both Node and Bun before the guard can run.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function ensureBunRuntime(entryUrl, argv) {
  if (process.versions?.bun) {
    return;
  }

  const entryPath = fileURLToPath(entryUrl);
  const result = spawnSync("bun", [entryPath, ...argv], { stdio: "inherit" });

  if (result.error) {
    process.stderr.write(
      [
        "",
        `error: ${entryPath}`,
        "  requires the Bun runtime under Node — this CLI's internal imports use",
        "  .mjs specifiers that only Bun's resolver maps to the .mts source",
        "  (astragenie/runner-plugin#389).",
        "",
        "  Fix: install Bun <https://bun.sh>, then re-run, e.g.:",
        `    bun "${entryPath}"${argv.length ? ` ${argv.join(" ")}` : ""}`,
        ""
      ].join("\n")
    );
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}
