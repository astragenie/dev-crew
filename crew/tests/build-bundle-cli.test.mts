import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

async function makeRepo(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bundle-cli-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "t@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
  await fs.writeFile(path.join(root, ".gitignore"), "node_modules\n", "utf8");
  execFileSync("git", ["add", "-A"], { cwd: root });
  execFileSync("git", ["commit", "-q", "-m", "init"], { cwd: root });
  return root;
}

test("crew.ts write-build-bundle: writes bundle artifact, prints path", async () => {
  const repo = await makeRepo();
  await fs.writeFile(path.join(repo, "a.ts"), "export const a = 1;\n", "utf8");

  const handoffPath = path.join(repo, "handoff.md");
  await fs.writeFile(handoffPath, "## Handoff body\n\nshort\n", "utf8");

  const crewScript = path.resolve(import.meta.dirname, "..", "scripts", "crew.mts");
  const out = execFileSync(
    "bun",
    [
      crewScript,
      "write-build-bundle",
      "--repo",
      repo,
      "--slice",
      "SLICE-77",
      "--builder",
      "backend-dev",
      "--run",
      "20260608T230000Z",
      "--feat",
      "FEAT-777",
      "--handoff",
      handoffPath,
      "--files",
      "a.ts",
      "--files-read",
      ""
    ],
    { encoding: "utf8" }
  );

  const printedPath = out.trim().split(/\r?\n/).pop() ?? "";
  expect(printedPath.endsWith("build-bundle.md"), `got: ${printedPath}`).toBeTruthy();
  const stat = await fs.stat(printedPath);
  expect(stat.size > 0).toBeTruthy();
});
