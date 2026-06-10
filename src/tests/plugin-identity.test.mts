import { test } from "bun:test";
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

test("findCrewCli sort: semver desc puts 0.13.1 before 0.9.0 (lex sort regression guard)", () => {
  // Lex sort bug: "0.9.0" > "0.13.1" alphabetically because "9" > "1".
  // findCrewCli must use compareSemver sort so the real newest version wins.
  const versions = ["0.9.0", "0.13.1", "0.10.0", "0.3.8"];
  const semverDesc = [...versions].sort((a, b) => compareSemver(b, a));
  assert.equal(semverDesc[0], "0.13.1", "semver sort must place 0.13.1 first");
  const lexDesc = [...versions].sort().reverse();
  assert.equal(lexDesc[0], "0.9.0", "lex sort bug: 0.9.0 wins — confirms we must use semver sort");
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
