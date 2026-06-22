// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { notifyEvent, readNotifyConfig, _internals } from "../scripts/lib/event-notifier.mjs";
import { _internals as tokenStoreInternals } from "../scripts/lib/token-store.mjs";
import { _internals as profilesInternals } from "../scripts/lib/env-profiles.mjs";

async function withTempRepo(loopJson: object): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-notify-int-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify(loopJson));
  return dir;
}

describe("notifyEvent — webhook delegation", () => {
  test("posts envelope to configured webhook with Bearer + tenant/app", async () => {
    const repo = await withTempRepo({
      loop: {
        notifications: {
          enabled: true,
          mode: "webhook",
          events: ["slice-complete"],
          webhook: {
            url: "https://runner.local/ingest",
            tenantId: "T",
            appId: "A",
            bearer: "B"
          }
        }
      }
    });

    const calls: { url: string; init?: RequestInit }[] = [];
    const originalFetch = _internals.fetch;
    _internals.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: typeof url === "string" ? url : url.toString(), init });
      return new Response(null, { status: 202 });
    }) as typeof _internals.fetch;

    try {
      const config = await readNotifyConfig(repo);
      await notifyEvent(
        {
          type: "slice-complete",
          sliceId: "SLICE-1",
          featureId: "FEAT-9",
          timestamp: "2026-06-15T12:00:00.000Z"
        },
        config
      );
    } finally {
      _internals.fetch = originalFetch;
      await fs.rm(repo, { recursive: true, force: true });
    }

    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe("https://runner.local/ingest");
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: "Bearer B",
      "Content-Type": "application/json"
    });
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.tenantId).toBe("T");
    expect(body.appId).toBe("A");
    expect(body.kind).toBe("slice-complete");
    expect(body.payload).toMatchObject({ sliceId: "SLICE-1", featureId: "FEAT-9" });
    expect(body.emittedAt).toBe("2026-06-15T12:00:00.000Z");
    expect(body.payload.type).toBeUndefined();
    expect(body.payload.timestamp).toBeUndefined();
  });

  test("Pattern B: resolves bearer from user-level token store when loop.json omits it", async () => {
    const repo = await withTempRepo({
      loop: {
        notifications: {
          enabled: true,
          mode: "webhook",
          events: ["slice-complete"],
          webhook: {
            url: "https://runner.local/ingest",
            tenantId: "T",
            appId: "app-pattern-b"
            // no bearer in committed config
          }
        }
      }
    });
    const tokenDir = await fs.mkdtemp(path.join(os.tmpdir(), "pattern-b-store-"));
    await fs.writeFile(
      path.join(tokenDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "app-pattern-b": { bearer: "lrt_resolved" } } })
    );
    const originalStorePath = tokenStoreInternals.storePath;
    tokenStoreInternals.storePath = () => path.join(tokenDir, "tokens.json");

    const calls: { init?: RequestInit }[] = [];
    const originalFetch = _internals.fetch;
    _internals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof _internals.fetch;

    try {
      const config = await readNotifyConfig(repo);
      expect(config.webhook?.bearer).toBe("lrt_resolved");
      await notifyEvent(
        { type: "slice-complete", sliceId: "S", timestamp: "2026-06-19T00:00:00.000Z" },
        config
      );
    } finally {
      _internals.fetch = originalFetch;
      tokenStoreInternals.storePath = originalStorePath;
      await fs.rm(repo, { recursive: true, force: true });
      await fs.rm(tokenDir, { recursive: true, force: true });
    }

    expect(calls.length).toBe(1);
    expect(calls[0].init?.headers).toMatchObject({ Authorization: "Bearer lrt_resolved" });
  });

  test("Pattern B: skips send when bearer missing and token store has no entry", async () => {
    const repo = await withTempRepo({
      loop: {
        notifications: {
          enabled: true,
          mode: "webhook",
          events: ["slice-complete"],
          webhook: {
            url: "https://runner.local/ingest",
            tenantId: "T",
            appId: "app-unknown"
          }
        }
      }
    });
    const tokenDir = await fs.mkdtemp(path.join(os.tmpdir(), "pattern-b-empty-"));
    const originalStorePath = tokenStoreInternals.storePath;
    tokenStoreInternals.storePath = () => path.join(tokenDir, "tokens.json");

    const calls: unknown[] = [];
    const originalFetch = _internals.fetch;
    _internals.fetch = (async () => {
      calls.push(1);
      return new Response(null, { status: 202 });
    }) as typeof _internals.fetch;

    try {
      const config = await readNotifyConfig(repo);
      expect(config.webhook?.bearer).toBeUndefined();
      await notifyEvent(
        { type: "slice-complete", sliceId: "S", timestamp: "2026-06-19T00:00:00.000Z" },
        config
      );
    } finally {
      _internals.fetch = originalFetch;
      tokenStoreInternals.storePath = originalStorePath;
      await fs.rm(repo, { recursive: true, force: true });
      await fs.rm(tokenDir, { recursive: true, force: true });
    }

    expect(calls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Env-profile integration tests (ASTRARUNNER_ENV)
// ---------------------------------------------------------------------------

describe("readNotifyConfig: ASTRARUNNER_ENV url precedence", () => {
  let tmpDir: string;
  let origProfilesDir: () => string;
  let origTokensStorePath: () => string;
  let origTokensProfilesDir: () => string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "notify-env-"));
    origProfilesDir = profilesInternals.profilesDir;
    origTokensStorePath = tokenStoreInternals.storePath;
    origTokensProfilesDir = tokenStoreInternals.profilesDir;
    profilesInternals.profilesDir = () => tmpDir;
    tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json");
    tokenStoreInternals.profilesDir = () => tmpDir;
    delete process.env["ASTRARUNNER_ENV"];
    delete process.env["LOOP_INGEST_URL"];
  });

  afterEach(async () => {
    profilesInternals.profilesDir = origProfilesDir;
    tokenStoreInternals.storePath = origTokensStorePath;
    tokenStoreInternals.profilesDir = origTokensProfilesDir;
    delete process.env["ASTRARUNNER_ENV"];
    delete process.env["LOOP_INGEST_URL"];
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("ASTRARUNNER_ENV=staging overrides loop.json url with profile ingestUrl", async () => {
    // profiles.json with staging entry
    await fs.writeFile(
      path.join(tmpDir, "profiles.json"),
      JSON.stringify({
        version: 1,
        envs: {
          staging: {
            ingestUrl: "https://staging.runner.example.com",
            tokensFile: "tokens.staging.json",
            label: "Stage"
          }
        }
      })
    );
    // staging tokens file with bearer
    await fs.writeFile(
      path.join(tmpDir, "tokens.staging.json"),
      JSON.stringify({ version: 1, tokens: { "app-stg": { bearer: "lrt_stg_bearer" } } })
    );
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "repo-stg-"));
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({
        loop: {
          notifications: {
            enabled: true,
            mode: "webhook",
            webhook: { url: "http://localhost:5137", tenantId: "T", appId: "app-stg" }
          }
        }
      })
    );

    process.env["ASTRARUNNER_ENV"] = "staging";
    try {
      const cfg = await readNotifyConfig(repo);
      expect(cfg.webhook?.url).toBe("https://staging.runner.example.com");
      expect(cfg.webhook?.bearer).toBe("lrt_stg_bearer");
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  test("LOOP_INGEST_URL wins over ASTRARUNNER_ENV profile and loop.json url", async () => {
    await fs.writeFile(
      path.join(tmpDir, "profiles.json"),
      JSON.stringify({
        version: 1,
        envs: {
          staging: {
            ingestUrl: "https://staging.runner.example.com",
            tokensFile: "tokens.staging.json",
            label: "Stage"
          }
        }
      })
    );
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "repo-override-"));
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({
        loop: {
          notifications: {
            enabled: true,
            mode: "webhook",
            webhook: {
              url: "http://loop-json.example.com",
              tenantId: "T",
              appId: "app-x",
              bearer: "b"
            }
          }
        }
      })
    );
    process.env["ASTRARUNNER_ENV"] = "staging";
    process.env["LOOP_INGEST_URL"] = "http://explicit-override.example.com";
    try {
      const cfg = await readNotifyConfig(repo);
      expect(cfg.webhook?.url).toBe("http://explicit-override.example.com");
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  test("ASTRARUNNER_ENV set but profiles.json missing → falls through to loop.json url", async () => {
    // No profiles.json in tmpDir
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "repo-fallthrough-"));
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({
        loop: {
          notifications: {
            enabled: true,
            mode: "webhook",
            webhook: {
              url: "http://loopjson-url.example.com",
              tenantId: "T",
              appId: "app-y",
              bearer: "bbb"
            }
          }
        }
      })
    );
    process.env["ASTRARUNNER_ENV"] = "staging";
    try {
      const cfg = await readNotifyConfig(repo);
      expect(cfg.webhook?.url).toBe("http://loopjson-url.example.com");
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  test("ASTRARUNNER_ENV=staging + tokens.staging.json absent → bearer stays unresolved (no fallback to tokens.json)", async () => {
    // profiles.json present
    await fs.writeFile(
      path.join(tmpDir, "profiles.json"),
      JSON.stringify({
        version: 1,
        envs: {
          staging: {
            ingestUrl: "https://stg.example.com",
            tokensFile: "tokens.staging.json",
            label: "Stage"
          }
        }
      })
    );
    // tokens.json has a valid entry — must NOT be used when env is explicit
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({
        version: 1,
        tokens: { "app-bleed": { bearer: "lrt_prod_bearer_DO_NOT_USE" } }
      })
    );
    // tokens.staging.json deliberately missing
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "repo-bleedguard-"));
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({
        loop: {
          notifications: {
            enabled: true,
            mode: "webhook",
            // no literal bearer — forces resolution via env
            webhook: { url: "http://x", tenantId: "T", appId: "app-bleed" }
          }
        }
      })
    );

    let fetchCount = 0;
    const originalFetch = _internals.fetch;
    _internals.fetch = (async () => {
      fetchCount++;
      return new Response(null, { status: 202 });
    }) as typeof _internals.fetch;

    process.env["ASTRARUNNER_ENV"] = "staging";
    try {
      const cfg = await readNotifyConfig(repo);
      // Bearer must be undefined — the prod token in tokens.json MUST NOT leak across tiers.
      expect(cfg.webhook?.bearer).toBeUndefined();

      // Downstream: notifyEvent must skip the POST because bearer is absent.
      await notifyEvent(
        {
          type: "slice-complete",
          sliceId: "SLICE-bleed",
          timestamp: "2026-06-22T00:00:00.000Z"
        },
        cfg
      );
      expect(fetchCount).toBe(0);
    } finally {
      _internals.fetch = originalFetch;
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  test("ASTRARUNNER_ENV=staging + bearer not in loop.json → resolves from tokens.staging.json", async () => {
    await fs.writeFile(
      path.join(tmpDir, "profiles.json"),
      JSON.stringify({
        version: 1,
        envs: {
          staging: {
            ingestUrl: "https://stg.example.com",
            tokensFile: "tokens.staging.json",
            label: "Stage"
          }
        }
      })
    );
    await fs.writeFile(
      path.join(tmpDir, "tokens.staging.json"),
      JSON.stringify({ version: 1, tokens: { "app-env": { bearer: "lrt_env_bearer" } } })
    );
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "repo-bearerenv-"));
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({
        loop: {
          notifications: {
            enabled: true,
            mode: "webhook",
            webhook: { url: "http://x", tenantId: "T", appId: "app-env" }
          }
        }
      })
    );
    process.env["ASTRARUNNER_ENV"] = "staging";
    try {
      const cfg = await readNotifyConfig(repo);
      expect(cfg.webhook?.bearer).toBe("lrt_env_bearer");
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });
});
