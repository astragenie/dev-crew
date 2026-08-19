// Covers the two drift guards added after the marketplace-org / registry-drift
// incident (runner-plugin#474 + registry stuck at 0.67.0 through 0.70.0):
//   - validate-org-refs.mts: stale "sergeymilashico" owner sweep of authored files.
//   - validate-marketplace-sync.mts: registry-entry vs plugin.json version compare.
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { compareVersions } from "../scripts/validate-marketplace-sync.mjs";
import { validateOrgRefs } from "../scripts/validate-org-refs.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

// --- validate-marketplace-sync compareVersions (pure) ---

test("compareVersions: ok when registry runner entry matches plugin.json", () => {
  const r = compareVersions("0.70.0", { plugins: [{ name: "devcrew", version: "0.70.0" }] });
  assert.equal(r.status, "ok");
});

test("compareVersions: drift when registry entry is behind", () => {
  const r = compareVersions("0.70.0", { plugins: [{ name: "devcrew", version: "0.67.0" }] });
  assert.equal(r.status, "drift");
  assert.equal(r.status === "drift" && r.registryVersion, "0.67.0");
});

test("compareVersions: drift (registryVersion null) when runner entry is absent", () => {
  const r = compareVersions("0.70.0", { plugins: [{ name: "crew", version: "0.61.0" }] });
  assert.equal(r.status, "drift");
  assert.equal(r.status === "drift" && r.registryVersion, null);
});

test("compareVersions: only the runner entry is consulted, not siblings", () => {
  const r = compareVersions("0.70.0", {
    plugins: [
      { name: "crew", version: "0.61.0" },
      { name: "devcrew", version: "0.70.0" },
      { name: "astramem", version: "0.6.1" }
    ]
  });
  assert.equal(r.status, "ok");
});

// --- validate-org-refs scan ---

test("validateOrgRefs: flags a stale sergeymilashico owner ref in an authored file", async () => {
  const repo = await tmpRepo("org-refs-bad-");
  await fs.writeFile(
    path.join(repo, "README.md"),
    "# x\n/plugin marketplace add sergeymilashico/astra-marketplace\n"
  );
  const r = await validateOrgRefs(repo);
  assert.equal(r.ok, false);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0]?.file, "README.md");
  assert.equal(r.findings[0]?.line, 2);
});

test("validateOrgRefs: clean when the owner is astragenie", async () => {
  const repo = await tmpRepo("org-refs-ok-");
  await fs.writeFile(
    path.join(repo, "README.md"),
    "# x\n/plugin marketplace add astragenie/astra-marketplace\n"
  );
  await fs.mkdir(path.join(repo, "src"), { recursive: true });
  await fs.writeFile(path.join(repo, "src", "a.mts"), "// astragenie/runner-plugin\n");
  const r = await validateOrgRefs(repo);
  assert.equal(r.ok, true);
  assert.deepEqual(r.findings, []);
});

test("validateOrgRefs: does not scan 3rdparty (vendored) subtrees", async () => {
  const repo = await tmpRepo("org-refs-3rdparty-");
  await fs.mkdir(path.join(repo, "agents", "3rdparty"), { recursive: true });
  await fs.writeFile(
    path.join(repo, "agents", "3rdparty", "vendored.md"),
    "see sergeymilashico/whatever\n"
  );
  const r = await validateOrgRefs(repo);
  assert.equal(r.ok, true, "3rdparty vendored files are out of scope");
});
