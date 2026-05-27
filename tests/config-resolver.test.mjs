import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveConfig,
  listPresets,
  writeConfigIfMissing,
  CONFIG_FILENAME
} from "../scripts/lib/config-resolver.mjs";

async function tmpRepo(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("listPresets returns dotnet-aspire-python with required fields", async () => {
  const presets = await listPresets();
  const dotnet = presets.find((p) => p.name === "dotnet-aspire-python");
  assert.ok(dotnet, "dotnet-aspire-python preset must ship in v1");
  assert.ok(dotnet.description.length > 0);
});

test("resolveConfig returns preset defaults when no user config exists", async () => {
  const repo = await tmpRepo("al-resolve-default-");
  const config = await resolveConfig(repo);
  assert.equal(config.preset, "dotnet-aspire-python");
  assert.equal(config.loop.aiLoopRoot, ".claude/artifacts/loop/ai-loop");
  assert.ok(Array.isArray(config.stack.build));
  assert.ok(config.stack.build.length > 0);
});

test("resolveConfig deep-merges user overrides on top of preset", async () => {
  const repo = await tmpRepo("al-resolve-merge-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, CONFIG_FILENAME),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      productName: "My Test Product",
      stack: {
        test: [{ cmd: "custom-test", args: ["--all"] }]
      }
    })
  );
  const config = await resolveConfig(repo);
  assert.equal(config.productName, "My Test Product");
  assert.equal(
    config.stack.test[0].cmd,
    "custom-test",
    "user test override should replace preset test array"
  );
  assert.ok(config.stack.build.length > 0, "preset build should remain after merge");
});

test("resolveConfig treats explicit null as disable", async () => {
  const repo = await tmpRepo("al-resolve-null-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, CONFIG_FILENAME),
    JSON.stringify({ preset: "dotnet-aspire-python", stack: { build: null } })
  );
  const config = await resolveConfig(repo);
  assert.equal(
    config.stack.build,
    null,
    "explicit null disables the stage even if preset has a default"
  );
});

test("resolveConfig throws on unknown preset", async () => {
  const repo = await tmpRepo("al-resolve-bad-");
  await assert.rejects(
    () => resolveConfig(repo, { preset: "nonexistent-preset" }),
    /Unknown preset "nonexistent-preset"/
  );
});

test("writeConfigIfMissing does not clobber existing config", async () => {
  const repo = await tmpRepo("al-write-skip-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  const original = JSON.stringify({ preset: "dotnet-aspire-python", productName: "existing" });
  await fs.writeFile(path.join(repo, CONFIG_FILENAME), original);
  const result = await writeConfigIfMissing(repo, {
    preset: "dotnet-aspire-python",
    productName: "new"
  });
  assert.equal(result.written, false);
  const onDisk = await fs.readFile(path.join(repo, CONFIG_FILENAME), "utf8");
  assert.equal(onDisk, original);
});

test("writeConfigIfMissing writes new config when missing", async () => {
  const repo = await tmpRepo("al-write-new-");
  const result = await writeConfigIfMissing(repo, {
    preset: "dotnet-aspire-python",
    productName: "Fresh"
  });
  assert.equal(result.written, true);
  const parsed = JSON.parse(await fs.readFile(path.join(repo, CONFIG_FILENAME), "utf8"));
  assert.equal(parsed.productName, "Fresh");
});
