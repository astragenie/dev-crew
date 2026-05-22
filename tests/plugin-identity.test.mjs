import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  compareSemver,
  getCrewVersion,
  MIN_CREW_VERSION
} from "../scripts/lib/plugin-identity.mjs";

test("compareSemver orders versions correctly", () => {
  assert.equal(compareSemver("0.1.12", "0.1.12"), 0);
  assert.equal(compareSemver("0.1.11", "0.1.12"), -1);
  assert.equal(compareSemver("0.1.12", "0.1.11"), 1);
  assert.equal(compareSemver("0.2.0", "0.1.99"), 1);
  assert.equal(compareSemver("1.0.0", "0.9.9"), 1);
  assert.equal(compareSemver("0.1", "0.1.0"), 0);
});

test("MIN_CREW_VERSION is a parseable semver string", () => {
  assert.match(MIN_CREW_VERSION, /^\d+\.\d+\.\d+$/);
});

test("getCrewVersion reads plugin.json adjacent to a crew CLI path", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "crew-ver-"));
  const scriptsDir = path.join(tmp, "scripts");
  const manifestDir = path.join(tmp, ".claude-plugin");
  await fs.mkdir(scriptsDir, { recursive: true });
  await fs.mkdir(manifestDir, { recursive: true });
  const cliPath = path.join(scriptsDir, "crew.mjs");
  await fs.writeFile(cliPath, "// stub");
  await fs.writeFile(
    path.join(manifestDir, "plugin.json"),
    JSON.stringify({ name: "crew", version: "0.9.9" })
  );

  const version = await getCrewVersion(cliPath);
  assert.equal(version, "0.9.9");

  assert.equal(await getCrewVersion(null), null);
  const emptyTmp = await fs.mkdtemp(path.join(os.tmpdir(), "crew-ver-missing-"));
  assert.equal(await getCrewVersion(path.join(emptyTmp, "scripts", "crew.mjs")), null);
});
