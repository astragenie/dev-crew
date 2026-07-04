import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { isFeatureEnabledLite, HOOK_FLAG_DEFAULTS } from "../../hooks/feature-flag-lite.mjs";

// Unit-level coverage for the shared lite reader consumed by the plain
// .mjs hooks (version-check.mjs, bootstrap-context.mjs, guard-feat-dispatch.mjs).
// Subprocess-level behavior for the hooks themselves lives in
// session-start-hooks.test.mts and guard-feat-dispatch-hook.test.mts.

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  return repo;
}

async function writeLoopConfig(repo: string, content: string): Promise<void> {
  await fs.writeFile(path.join(repo, ".claude", "loop.json"), content);
}

test("isFeatureEnabledLite: no .claude/loop.json at all -> registered default (true)", async () => {
  const repo = await tmpRepo("ffl-nofile-");
  assert.equal(isFeatureEnabledLite("version-check", repo), true);
});

test("isFeatureEnabledLite: corrupt (unparseable) loop.json -> falls back to default, never throws", async () => {
  const repo = await tmpRepo("ffl-corrupt-");
  await writeLoopConfig(repo, "{ not valid json ,,, ][");
  assert.doesNotThrow(() => {
    const result = isFeatureEnabledLite("dispatch-guard-block", repo);
    assert.equal(result, true);
  });
});

test("isFeatureEnabledLite: explicit enabled=false is honored", async () => {
  const repo = await tmpRepo("ffl-disabled-");
  await writeLoopConfig(
    repo,
    JSON.stringify({ features: { "bootstrap-context": { enabled: false } } })
  );
  assert.equal(isFeatureEnabledLite("bootstrap-context", repo), false);
});

test("isFeatureEnabledLite: explicit enabled=true is honored", async () => {
  const repo = await tmpRepo("ffl-enabled-");
  await writeLoopConfig(repo, JSON.stringify({ features: { "version-check": { enabled: true } } }));
  assert.equal(isFeatureEnabledLite("version-check", repo), true);
});

test("isFeatureEnabledLite: malformed feature entry (not an object) falls back to default", async () => {
  const repo = await tmpRepo("ffl-malformed-");
  await writeLoopConfig(repo, JSON.stringify({ features: { "version-check": "yes" } }));
  assert.equal(isFeatureEnabledLite("version-check", repo), true);
});

test("isFeatureEnabledLite: unknown flag name not in HOOK_FLAG_DEFAULTS still defaults to true", async () => {
  const repo = await tmpRepo("ffl-unknown-");
  assert.equal(isFeatureEnabledLite("some-flag-no-hook-consumes", repo), true);
});

test("HOOK_FLAG_DEFAULTS covers exactly the 3 flags read by the plain .mjs hooks", () => {
  assert.deepEqual(
    Object.keys(HOOK_FLAG_DEFAULTS).sort(),
    ["bootstrap-context", "dispatch-guard-block", "version-check"].sort()
  );
});
