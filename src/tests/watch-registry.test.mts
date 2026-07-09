import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { readRegistry, validateRegistry } from "../scripts/lib/watch/registry.mjs";
import type { RegistryFile } from "../scripts/lib/watch/types.mjs";

async function tmpRegistryFile(content: unknown): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "watch-registry-test-"));
  const file = path.join(dir, "repos.json");
  await fs.writeFile(
    file,
    typeof content === "string" ? content : JSON.stringify(content),
    "utf-8"
  );
  return file;
}

function validRegistry(): RegistryFile {
  return {
    controlRepoPath: "C:\\work\\control-repo",
    entries: [
      {
        path: "C:\\work\\repo-a",
        ghSlug: "org/repo-a",
        shard: 1,
        tier: 1,
        tenantId: "t1",
        appId: "a1"
      },
      {
        path: "C:\\work\\repo-b",
        ghSlug: "org/repo-b",
        shard: 2,
        tier: 2,
        tenantId: "t1",
        appId: "a1"
      }
    ]
  };
}

// ---------------------------------------------------------------------------
// readRegistry

test("readRegistry parses a well-formed registry file", async () => {
  const file = await tmpRegistryFile(validRegistry());
  const registry = await readRegistry(file);
  assert.equal(registry.entries.length, 2);
  assert.equal(registry.controlRepoPath, "C:\\work\\control-repo");
});

test("readRegistry throws on malformed JSON", async () => {
  const file = await tmpRegistryFile("{ not valid json");
  await assert.rejects(() => readRegistry(file), /could not parse registry JSON/);
});

test("readRegistry throws when the file does not exist", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "watch-registry-test-"));
  await assert.rejects(
    () => readRegistry(path.join(dir, "missing.json")),
    /could not read registry/
  );
});

// ---------------------------------------------------------------------------
// validateRegistry

test("validateRegistry accepts a well-formed registry", () => {
  const result = validateRegistry(validRegistry());
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateRegistry rejects a duplicate ghSlug across shards (exclusivity)", () => {
  const registry = validRegistry();
  registry.entries.push({
    path: "C:\\work\\repo-a-again",
    ghSlug: "org/repo-a",
    shard: 2,
    tier: 1,
    tenantId: "t1",
    appId: "a1"
  });
  const result = validateRegistry(registry);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("shard exclusivity")));
});

test("validateRegistry rejects an invalid tier", () => {
  const registry = validRegistry();
  // @ts-expect-error deliberately invalid for the test
  registry.entries[0]!.tier = 3;
  const result = validateRegistry(registry);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("tier must be 1 or 2")));
});

test("validateRegistry rejects a non-positive shard", () => {
  const registry = validRegistry();
  registry.entries[0]!.shard = 0;
  const result = validateRegistry(registry);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("shard must be a positive integer")));
});

test("validateRegistry rejects missing tenantId/appId", () => {
  const registry = validRegistry();
  registry.entries[0]!.tenantId = "";
  registry.entries[1]!.appId = "";
  const result = validateRegistry(registry);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("tenantId")));
  assert.ok(result.errors.some((e) => e.includes("appId")));
});

test("validateRegistry rejects a missing controlRepoPath", () => {
  const registry = validRegistry();
  registry.controlRepoPath = "";
  const result = validateRegistry(registry);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("controlRepoPath")));
});
