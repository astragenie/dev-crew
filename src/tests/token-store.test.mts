// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveBearer, _internals } from "../scripts/lib/token-store.mjs";

let tmpDir: string;
let originalStorePath: () => string;
let originalProfilesDir: () => string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "token-store-"));
  originalStorePath = _internals.storePath;
  originalProfilesDir = _internals.profilesDir;
  _internals.storePath = () => path.join(tmpDir, "tokens.json");
  _internals.profilesDir = () => tmpDir;
});

afterEach(async () => {
  _internals.storePath = originalStorePath;
  _internals.profilesDir = originalProfilesDir;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Existing tests — no-env (legacy) path
// ---------------------------------------------------------------------------

describe("resolveBearer (no env)", () => {
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

// ---------------------------------------------------------------------------
// Env-aware tests — explicit env param
// ---------------------------------------------------------------------------

describe("resolveBearer (with env)", () => {
  test("reads tokens.<env>.json when env provided and file exists", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.staging.json"),
      JSON.stringify({
        version: 1,
        tokens: { "app-1": { bearer: "lrt_staging_token" } }
      })
    );
    expect(await resolveBearer("app-1", "staging")).toBe("lrt_staging_token");
  });

  test("returns null when tokens.<env>.json missing (no fallback to tokens.json)", async () => {
    // Write tokens.json with a valid entry — the env lookup must NOT fall back to it.
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_default" } } })
    );
    // tokens.staging.json is absent — explicit tier, should return null.
    expect(await resolveBearer("app-1", "staging")).toBeNull();
  });

  test("returns null when appId not found in tier-specific file (no fallback)", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.staging.json"),
      JSON.stringify({ version: 1, tokens: { "app-other": { bearer: "lrt_other" } } })
    );
    // tokens.json also has app-1 but must not be used.
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_default" } } })
    );
    expect(await resolveBearer("app-1", "staging")).toBeNull();
  });

  test("returns null when tier-specific file is malformed JSON", async () => {
    await fs.writeFile(path.join(tmpDir, "tokens.local.json"), "{bad json");
    expect(await resolveBearer("app-1", "local")).toBeNull();
  });

  test("custom tokensFile arg overrides conventional tokens.<env>.json name", async () => {
    // Caller passes profile.tokensFile from profiles.json — must be honored.
    await fs.writeFile(
      path.join(tmpDir, "tokens.staging-eu.json"),
      JSON.stringify({ version: 1, tokens: { "app-eu": { bearer: "lrt_eu_token" } } })
    );
    // Conventional tokens.staging.json exists too — must NOT be read.
    await fs.writeFile(
      path.join(tmpDir, "tokens.staging.json"),
      JSON.stringify({ version: 1, tokens: { "app-eu": { bearer: "lrt_staging_default" } } })
    );
    expect(await resolveBearer("app-eu", "staging", "tokens.staging-eu.json")).toBe("lrt_eu_token");
  });

  test("empty tokensFile arg falls back to conventional tokens.<env>.json", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.staging.json"),
      JSON.stringify({ version: 1, tokens: { "app-x": { bearer: "lrt_x" } } })
    );
    expect(await resolveBearer("app-x", "staging", "")).toBe("lrt_x");
  });

  test("reads tokens.local.json for local env", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.local.json"),
      JSON.stringify({ version: 1, tokens: { "app-local": { bearer: "lrt_local_tok" } } })
    );
    expect(await resolveBearer("app-local", "local")).toBe("lrt_local_tok");
  });

  test("reads tokens.prod.json for prod env", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.prod.json"),
      JSON.stringify({ version: 1, tokens: { "app-p": { bearer: "lrt_prod_tok" } } })
    );
    expect(await resolveBearer("app-p", "prod")).toBe("lrt_prod_tok");
  });

  test("different tiers resolve to different bearers for same appId", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.staging.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_stg" } } })
    );
    await fs.writeFile(
      path.join(tmpDir, "tokens.prod.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_prd" } } })
    );
    expect(await resolveBearer("app-1", "staging")).toBe("lrt_stg");
    expect(await resolveBearer("app-1", "prod")).toBe("lrt_prd");
  });
});
