// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { readProfile, _internals } from "../scripts/lib/env-profiles.mjs";

let tmpDir: string;
let originalProfilesDir: () => string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "env-profiles-"));
  originalProfilesDir = _internals.profilesDir;
  _internals.profilesDir = () => tmpDir;
});

afterEach(async () => {
  _internals.profilesDir = originalProfilesDir;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const VALID_PROFILES = {
  version: 1,
  envs: {
    local: {
      ingestUrl: "http://localhost:5137",
      tokensFile: "tokens.local.json",
      label: "Local-DEV"
    },
    staging: {
      ingestUrl: "https://app-dev.example.com",
      tokensFile: "tokens.staging.json",
      label: "Stage"
    },
    prod: { ingestUrl: "https://app.example.com", tokensFile: "tokens.prod.json", label: "PROD" }
  }
};

describe("readProfile", () => {
  test("returns profile for known env", async () => {
    await fs.writeFile(path.join(tmpDir, "profiles.json"), JSON.stringify(VALID_PROFILES));
    const p = await readProfile("staging");
    expect(p).not.toBeNull();
    expect(p!.ingestUrl).toBe("https://app-dev.example.com");
    expect(p!.tokensFile).toBe("tokens.staging.json");
    expect(p!.label).toBe("Stage");
  });

  test("returns profile for local env", async () => {
    await fs.writeFile(path.join(tmpDir, "profiles.json"), JSON.stringify(VALID_PROFILES));
    const p = await readProfile("local");
    expect(p!.ingestUrl).toBe("http://localhost:5137");
  });

  test("returns profile for prod env", async () => {
    await fs.writeFile(path.join(tmpDir, "profiles.json"), JSON.stringify(VALID_PROFILES));
    const p = await readProfile("prod");
    expect(p!.ingestUrl).toBe("https://app.example.com");
  });

  test("returns null when profiles.json missing (fail-silent)", async () => {
    const p = await readProfile("staging");
    expect(p).toBeNull();
  });

  test("returns null when profiles.json is malformed JSON (fail-silent)", async () => {
    await fs.writeFile(path.join(tmpDir, "profiles.json"), "{ bad json");
    expect(await readProfile("staging")).toBeNull();
  });

  test("returns null for unknown env name", async () => {
    await fs.writeFile(path.join(tmpDir, "profiles.json"), JSON.stringify(VALID_PROFILES));
    expect(await readProfile("canary")).toBeNull();
  });

  test("returns null for empty env string", async () => {
    await fs.writeFile(path.join(tmpDir, "profiles.json"), JSON.stringify(VALID_PROFILES));
    expect(await readProfile("")).toBeNull();
  });

  test("returns null when envs map missing in file", async () => {
    await fs.writeFile(path.join(tmpDir, "profiles.json"), JSON.stringify({ version: 1 }));
    expect(await readProfile("staging")).toBeNull();
  });

  test("returns null when env entry has empty ingestUrl", async () => {
    const bad = {
      version: 1,
      envs: { staging: { ingestUrl: "", tokensFile: "tokens.staging.json", label: "Stage" } }
    };
    await fs.writeFile(path.join(tmpDir, "profiles.json"), JSON.stringify(bad));
    expect(await readProfile("staging")).toBeNull();
  });

  test("uses env name as label fallback when label field missing", async () => {
    const noLabel = {
      version: 1,
      envs: { staging: { ingestUrl: "https://x.example.com", tokensFile: "tokens.staging.json" } }
    };
    await fs.writeFile(path.join(tmpDir, "profiles.json"), JSON.stringify(noLabel));
    const p = await readProfile("staging");
    expect(p!.label).toBe("staging");
  });
});
