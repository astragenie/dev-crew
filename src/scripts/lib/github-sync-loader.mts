import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Runtime-only github-sync modules ship as hand-authored `.mjs` under
// `scripts/lib/` (no `.mts` source — ambient `.d.mts` shims live alongside
// this file for tsc). After the Bun migration there is no emitted tree, so a
// plain `import("./github-sync.mjs")` from `src/scripts/lib/` resolves to a
// path that does not exist. This loader resolves the real runtime location
// from either layout and imports via a computed `file://` URL, so tsc treats
// the result as `any` (no shim lookup) and Bun loads the module on any OS.
//
// `rel` is the path relative to the github-sync lib root, e.g.
// `"github-sync.mjs"` or `"github-sync/gh.mjs"`.
export async function importGithubSync(rel: string): Promise<any> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    // Co-located layout (if a runtime tree ever sits beside this file).
    path.resolve(here, rel),
    // Src-direct layout: <repoRoot>/scripts/lib/<rel> (here is src/scripts/lib).
    path.resolve(here, "..", "..", "..", "scripts", "lib", rel)
  ];
  let firstError: unknown;
  for (const candidate of candidates) {
    try {
      return await import(pathToFileURL(candidate).href);
    } catch (err) {
      if (firstError === undefined) firstError = err;
    }
  }
  throw firstError;
}
