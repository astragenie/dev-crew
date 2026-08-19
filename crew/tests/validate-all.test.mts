import path from "node:path";
import { test, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scriptPath = path.join(repoRoot, "scripts", "validate-all.mts");

function runValidateAll(cwd = repoRoot) {
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    timeout: 60_000,
    cwd
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

test("validate-all: exits 0 on clean repo and reports all validators passed", () => {
  const { status, stdout } = runValidateAll();
  expect(status, `expected exit 0 but got ${status}`).toBe(0);
  expect(stdout).toMatch(/All 4 validators passed\./);
});

test("validate-all: stdout contains a check mark for each validator on success", () => {
  const { status, stdout } = runValidateAll();
  expect(status).toBe(0);
  expect(stdout).toMatch(/✓ validate-manifests\.mts/);
  // FEAT-015/SLICE-33: validate-skills.mts / validate-agents.mts promoted
  // from advisory to blocking after the content backfill (SLICE-24 debt
  // cleared) — both now report a check mark like every other validator.
  expect(stdout).toMatch(/✓ validate-skills\.mts/);
  expect(stdout).toMatch(/✓ validate-agents\.mts/);
  expect(stdout).toMatch(/✓ validate-slices\.mts/);
});
