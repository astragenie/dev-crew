import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  compareSemver,
  MIN_BUN_VERSION,
  checkBunVersion
} from "../scripts/lib/plugin-identity.mjs";

test("compareSemver orders versions correctly", () => {
  assert.equal(compareSemver("0.1.12", "0.1.12"), 0);
  assert.equal(compareSemver("0.1.11", "0.1.12"), -1);
  assert.equal(compareSemver("0.1.12", "0.1.11"), 1);
  assert.equal(compareSemver("0.2.0", "0.1.99"), 1);
  assert.equal(compareSemver("1.0.0", "0.9.9"), 1);
  assert.equal(compareSemver("0.1", "0.1.0"), 0);
});

test("compareSemver sort: semver desc puts 0.13.1 before 0.9.0 (lex sort regression guard)", () => {
  // Lex sort bug: "0.9.0" > "0.13.1" alphabetically because "9" > "1". Any
  // caller sorting version strings (e.g. picking the newest of several) must
  // use compareSemver, not a plain string sort.
  const versions = ["0.9.0", "0.13.1", "0.10.0", "0.3.8"];
  const semverDesc = [...versions].sort((a, b) => compareSemver(b, a));
  assert.equal(semverDesc[0], "0.13.1", "semver sort must place 0.13.1 first");
  const lexDesc = [...versions].sort().reverse();
  assert.equal(lexDesc[0], "0.9.0", "lex sort bug: 0.9.0 wins — confirms we must use semver sort");
});

test("MIN_BUN_VERSION is a parseable semver string", () => {
  assert.match(MIN_BUN_VERSION, /^\d+\.\d+\.\d+$/);
});

test("checkBunVersion ok when override meets minimum", async () => {
  const r = await checkBunVersion(MIN_BUN_VERSION);
  assert.equal(r.ok, true);
  assert.equal(r.required, MIN_BUN_VERSION);
});

test("checkBunVersion fails on older version", async () => {
  const r = await checkBunVersion("0.0.1");
  assert.equal(r.ok, false);
});

test("checkBunVersion fails when bun missing (null override)", async () => {
  const r = await checkBunVersion(null);
  assert.equal(r.ok, false);
  assert.equal(r.version, null);
});
