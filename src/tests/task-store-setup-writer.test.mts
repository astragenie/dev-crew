// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeTaskStoreConfig, VALID_PROVIDERS } from "../scripts/lib/task-store/setup-writer.mjs";

async function makeTmpRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-setup-test-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  const cfg = { loop: {}, github: null };
  await fs.writeFile(path.join(dir, ".claude/loop.json"), JSON.stringify(cfg, null, 2) + "\n");
  return dir;
}

// ---------------------------------------------------------------------------
// VALID_PROVIDERS export
// ---------------------------------------------------------------------------
test("VALID_PROVIDERS contains github, noop, linear", () => {
  assert.ok(VALID_PROVIDERS.includes("github"));
  assert.ok(VALID_PROVIDERS.includes("noop"));
  assert.ok(VALID_PROVIDERS.includes("linear"));
});

// ---------------------------------------------------------------------------
// writeTaskStoreConfig — writes taskStore block
// ---------------------------------------------------------------------------
test("writeTaskStoreConfig sets taskStore.provider in loop.json", async () => {
  const dir = await makeTmpRepo();
  try {
    const result = await writeTaskStoreConfig(dir, "noop");
    const cfg = JSON.parse(await fs.readFile(path.join(dir, ".claude/loop.json"), "utf8"));
    assert.equal(cfg.taskStore.provider, "noop");
    assert.equal(result.provider, "noop");
    assert.ok(result.configPath.includes("loop.json"));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("writeTaskStoreConfig provider=github also sets back-compat github.enabled", async () => {
  const dir = await makeTmpRepo();
  try {
    await writeTaskStoreConfig(dir, "github");
    const cfg = JSON.parse(await fs.readFile(path.join(dir, ".claude/loop.json"), "utf8"));
    assert.equal(cfg.taskStore.provider, "github");
    assert.equal(cfg.github.enabled, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("writeTaskStoreConfig provider=noop does not overwrite existing github block", async () => {
  const dir = await makeTmpRepo();
  try {
    const cfgPath = path.join(dir, ".claude/loop.json");
    const existing = JSON.parse(await fs.readFile(cfgPath, "utf8"));
    existing.github = { enabled: true, repo: "org/repo" };
    await fs.writeFile(cfgPath, JSON.stringify(existing, null, 2) + "\n");

    await writeTaskStoreConfig(dir, "noop");
    const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
    assert.equal(cfg.taskStore.provider, "noop");
    assert.equal(cfg.github.repo, "org/repo", "should preserve existing github block");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("writeTaskStoreConfig preserves other loop.json fields", async () => {
  const dir = await makeTmpRepo();
  try {
    const cfgPath = path.join(dir, ".claude/loop.json");
    const existing = JSON.parse(await fs.readFile(cfgPath, "utf8"));
    existing.productName = "my-product";
    existing.loop = { maxIterations: 10 };
    await fs.writeFile(cfgPath, JSON.stringify(existing, null, 2) + "\n");

    await writeTaskStoreConfig(dir, "noop");
    const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
    assert.equal(cfg.productName, "my-product");
    assert.equal(cfg.loop.maxIterations, 10);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("writeTaskStoreConfig returns featCount 0 when backlog absent", async () => {
  const dir = await makeTmpRepo();
  try {
    const result = await writeTaskStoreConfig(dir, "noop");
    assert.equal(result.featCount, 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// writeTaskStoreConfig — validation
// ---------------------------------------------------------------------------
test("writeTaskStoreConfig throws on unknown provider", async () => {
  const dir = await makeTmpRepo();
  try {
    await assert.rejects(() => writeTaskStoreConfig(dir, "jira"), /Unknown provider "jira"/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("writeTaskStoreConfig throws when loop.json missing", async () => {
  const dir = await makeTmpRepo();
  try {
    await fs.unlink(path.join(dir, ".claude/loop.json"));
    await assert.rejects(() => writeTaskStoreConfig(dir, "github"), /ENOENT/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
