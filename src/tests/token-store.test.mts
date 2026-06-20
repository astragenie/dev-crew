// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveBearer, _internals } from "../scripts/lib/token-store.mjs";

let tmpDir: string;
let originalStorePath: () => string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "token-store-"));
  originalStorePath = _internals.storePath;
  _internals.storePath = () => path.join(tmpDir, "tokens.json");
});

afterEach(async () => {
  _internals.storePath = originalStorePath;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("resolveBearer", () => {
  test("returns bearer for known appId", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({
        version: 1,
        tokens: {
          "app-1": { bearer: "lrt_abc", label: "test" }
        }
      })
    );
    expect(await resolveBearer("app-1")).toBe("lrt_abc");
  });

  test("returns null for unknown appId", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_abc" } } })
    );
    expect(await resolveBearer("app-other")).toBeNull();
  });

  test("returns null when store file missing", async () => {
    expect(await resolveBearer("app-1")).toBeNull();
  });

  test("returns null when store file is malformed JSON", async () => {
    await fs.writeFile(path.join(tmpDir, "tokens.json"), "{not json");
    expect(await resolveBearer("app-1")).toBeNull();
  });

  test("returns null when tokens map missing", async () => {
    await fs.writeFile(path.join(tmpDir, "tokens.json"), JSON.stringify({ version: 1 }));
    expect(await resolveBearer("app-1")).toBeNull();
  });

  test("returns null when entry has empty bearer", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "" } } })
    );
    expect(await resolveBearer("app-1")).toBeNull();
  });

  test("returns null for empty appId argument", async () => {
    expect(await resolveBearer("")).toBeNull();
  });

  test("returns null when entry bearer is non-string", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: 42 } } })
    );
    expect(await resolveBearer("app-1")).toBeNull();
  });
});
