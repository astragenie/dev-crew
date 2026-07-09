import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { getContractsPath, contractsArtifactExists } from "../scripts/lib/contracts-artifact.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("getContractsPath resolves canonical path for FEAT-050", () => {
  const repo = "/some/repo";
  const result = getContractsPath(repo, "FEAT-050");
  assert.ok(
    result.endsWith("/.claude/artifacts/crew/designs/FEAT-050-contracts.openapi.yaml"),
    `expected canonical path suffix, got: ${result}`
  );
  assert.ok(result.includes("FEAT-050-contracts.openapi.yaml"), "path must contain the feature id");
});

test("getContractsPath resolves canonical path for different FEAT IDs", () => {
  const repo = "/work/my-repo";
  assert.ok(
    getContractsPath(repo, "FEAT-001").endsWith(
      "/.claude/artifacts/crew/designs/FEAT-001-contracts.openapi.yaml"
    )
  );
  assert.ok(
    getContractsPath(repo, "FEAT-999").endsWith(
      "/.claude/artifacts/crew/designs/FEAT-999-contracts.openapi.yaml"
    )
  );
});

test("getContractsPath uses forward slashes on Windows-style repo paths", () => {
  const repo = "C:\\work\\mega\\loop";
  const result = getContractsPath(repo, "FEAT-007");
  assert.ok(!result.includes("\\"), `expected forward slashes only, got: ${result}`);
  assert.ok(result.endsWith("/.claude/artifacts/crew/designs/FEAT-007-contracts.openapi.yaml"));
});

test("contractsArtifactExists returns false when file is absent", async () => {
  const repo = await tmpRepo("ca-absent-");
  const exists = await contractsArtifactExists(repo, "FEAT-050");
  assert.equal(exists, false);
});

test("contractsArtifactExists returns true when file is present", async () => {
  const repo = await tmpRepo("ca-present-");
  const contractsDir = path.join(repo, ".claude", "artifacts", "crew", "designs");
  await fs.mkdir(contractsDir, { recursive: true });
  await fs.writeFile(path.join(contractsDir, "FEAT-050-contracts.openapi.yaml"), "");
  const exists = await contractsArtifactExists(repo, "FEAT-050");
  assert.equal(exists, true);
});
