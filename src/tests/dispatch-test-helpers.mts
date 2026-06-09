// @ts-nocheck
// Shared test helpers for the dispatch-* test suite.
// Imported by every dispatch-*.test.mts file.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

export function tmpRepo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "loop-dispatch-test-"));
}

export function initRepo(): string {
  const dir = tmpRepo();
  execSync("git init -q -b main", { cwd: dir });
  execSync('git config user.email "test@example.com"', { cwd: dir });
  execSync('git config user.name "Test"', { cwd: dir });
  fs.writeFileSync(path.join(dir, "README.md"), "# test\n");
  execSync("git add . && git commit -q -m init", { cwd: dir });
  return dir;
}

export function makeStubAgent(
  repo,
  perChild,
) {
  return async (batch, ctx) => {
    const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
    fs.mkdirSync(dir, { recursive: true });
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const cwd = ctx.cwdById[id];
      const branch = ctx.branchById[id];
      const action = perChild(id, cwd);
      if (action.commit) {
        fs.writeFileSync(path.join(cwd, action.commit), `${id}\n`);
        execSync(`git add . && git commit -qm "child ${id}"`, { cwd });
      }
      const marker = {
        id, status: action.status, branch, worktreePath: cwd,
        ...(action.status !== "DONE" ? { error: "stub failure" } : {}),
      };
      fs.writeFileSync(path.join(dir, `${id}.result.json`), JSON.stringify(marker));
    }
  };
}
