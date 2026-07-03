// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// We test postAgentCompletions indirectly by observing fetch calls via
// a global fetch mock. We also override _internals on env-profiles to
// redirect profile reads to a temp dir.
import { postAgentCompletions } from "../scripts/lib/slice-linker/astrarunner-ingest.mjs";
import { _internals as profilesInternals } from "../scripts/lib/env-profiles.mjs";
import { _internals as tokenStoreInternals } from "../scripts/lib/token-store.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write a temp repo dir with .claude/loop.json — mirrors withTempRepo in
 * event-notifier-webhook.test.mts. */
async function withTempLoopJson(dir: string, loopJson: object): Promise<string> {
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify(loopJson));
  return dir;
}

const BASE_ROW = {
  agentType: "builder",
  model: "claude-3-5-sonnet",
  turns: 3,
  duration_ms: 1200,
  tools: new Map([["Bash", 2]]),
  skills: [],
  inputTokens: 500,
  outputTokens: 200,
  firstOutputAt: "2026-06-22T10:00:00.000Z",
  startTs: "2026-06-22T09:59:58.000Z",
  stopTs: "2026-06-22T10:00:00.000Z"
};

let tmpDir: string;
let originalProfilesDir: () => string;
let originalTokenStorePath: () => string;
let originalTokenProfilesDir: () => string;
let originalFetch: typeof globalThis.fetch;
let fetchCalls: Array<{ url: string; init?: RequestInit }>;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ingest-test-"));
  originalProfilesDir = profilesInternals.profilesDir;
  profilesInternals.profilesDir = () => tmpDir;
  originalTokenStorePath = tokenStoreInternals.storePath;
  originalTokenProfilesDir = tokenStoreInternals.profilesDir;

  fetchCalls = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    fetchCalls.push({ url: typeof url === "string" ? url : url.toString(), init });
    return new Response(null, { status: 202 });
  }) as typeof globalThis.fetch;

  delete process.env["ASTRARUNNER_ENV"];
  delete process.env["LOOP_INGEST_URL"];
  delete process.env["LOOP_INGEST_TOKEN"];
  delete process.env["CLAUDE_PLUGIN_OPTION_INGEST_URL"];
  delete process.env["CLAUDE_PLUGIN_OPTION_INGEST_TOKEN"];
  delete process.env["CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV"];
});

afterEach(async () => {
  profilesInternals.profilesDir = originalProfilesDir;
  tokenStoreInternals.storePath = originalTokenStorePath;
  tokenStoreInternals.profilesDir = originalTokenProfilesDir;
  globalThis.fetch = originalFetch;
  delete process.env["ASTRARUNNER_ENV"];
  delete process.env["LOOP_INGEST_URL"];
  delete process.env["LOOP_INGEST_TOKEN"];
  delete process.env["CLAUDE_PLUGIN_OPTION_INGEST_URL"];
  delete process.env["CLAUDE_PLUGIN_OPTION_INGEST_TOKEN"];
  delete process.env["CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV"];
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("postAgentCompletions: Path 2 env resolution", () => {
  test("is a no-op when neither LOOP_INGEST_URL nor ASTRARUNNER_ENV set", async () => {
    process.env["LOOP_INGEST_TOKEN"] = "lrt_tok";
    const result = await postAgentCompletions({
      sliceId: "SLICE-1",
      agents: [BASE_ROW]
    });
    expect(fetchCalls.length).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.posted).toBe(0);
  });

  test("is a no-op when URL present but LOOP_INGEST_TOKEN missing", async () => {
    process.env["LOOP_INGEST_URL"] = "http://localhost:5137";
    const result = await postAgentCompletions({
      sliceId: "SLICE-1",
      agents: [BASE_ROW]
    });
    expect(fetchCalls.length).toBe(0);
    expect(result.skipped).toBe(1);
  });

  test("LOOP_INGEST_URL wins: posts to explicit URL", async () => {
    process.env["LOOP_INGEST_URL"] = "http://explicit.example.com";
    process.env["LOOP_INGEST_TOKEN"] = "lrt_tok";
    const result = await postAgentCompletions({ sliceId: "SLICE-2", agents: [BASE_ROW] });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("http://explicit.example.com/api/v2/ingest/loop-events");
    expect(result.posted).toBe(1);
  });

  test("plugin-manager options (ingest_url + ingest_token) drive a real POST", async () => {
    // Simulates a customer who pasted token + environment URL in the Claude
    // Code plugin manager — no LOOP_INGEST_* env vars, no profiles.json.
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_URL"] = "https://api.astrarunner.com";
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_TOKEN"] = "lrt_plugin";
    const result = await postAgentCompletions({ sliceId: "SLICE-P1", agents: [BASE_ROW] });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("https://api.astrarunner.com/api/v2/ingest/loop-events");
    expect(fetchCalls[0].init?.headers).toMatchObject({ authorization: "Bearer lrt_plugin" });
    expect(result.posted).toBe(1);
  });

  test("LOOP_INGEST_* env vars win over plugin-manager options", async () => {
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_URL"] = "https://api.astrarunner.com";
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_TOKEN"] = "lrt_plugin";
    process.env["LOOP_INGEST_URL"] = "http://localhost:5137";
    process.env["LOOP_INGEST_TOKEN"] = "lrt_env";
    const result = await postAgentCompletions({ sliceId: "SLICE-P2", agents: [BASE_ROW] });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("http://localhost:5137/api/v2/ingest/loop-events");
    expect(fetchCalls[0].init?.headers).toMatchObject({ authorization: "Bearer lrt_env" });
    expect(result.posted).toBe(1);
  });

  test("ASTRARUNNER_ENV=local + no LOOP_INGEST_URL → resolves URL from profile", async () => {
    await fs.writeFile(
      path.join(tmpDir, "profiles.json"),
      JSON.stringify({
        version: 1,
        envs: {
          local: {
            ingestUrl: "http://localhost:5137",
            tokensFile: "tokens.local.json",
            label: "Local-DEV"
          }
        }
      })
    );
    process.env["ASTRARUNNER_ENV"] = "local";
    process.env["LOOP_INGEST_TOKEN"] = "lrt_tok";

    const result = await postAgentCompletions({ sliceId: "SLICE-3", agents: [BASE_ROW] });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("http://localhost:5137/api/v2/ingest/loop-events");
    expect(result.posted).toBe(1);
  });

  test("LOOP_INGEST_URL wins over ASTRARUNNER_ENV profile", async () => {
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
    process.env["ASTRARUNNER_ENV"] = "staging";
    process.env["LOOP_INGEST_URL"] = "http://override.example.com";
    process.env["LOOP_INGEST_TOKEN"] = "lrt_tok";

    const result = await postAgentCompletions({ sliceId: "SLICE-4", agents: [BASE_ROW] });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("http://override.example.com/api/v2/ingest/loop-events");
    expect(result.posted).toBe(1);
  });

  test("ASTRARUNNER_ENV set but profiles.json missing → no URL, is a no-op", async () => {
    process.env["ASTRARUNNER_ENV"] = "staging";
    process.env["LOOP_INGEST_TOKEN"] = "lrt_tok";
    // No profiles.json in tmpDir

    const result = await postAgentCompletions({ sliceId: "SLICE-5", agents: [BASE_ROW] });
    expect(fetchCalls.length).toBe(0);
    expect(result.skipped).toBe(1);
  });

  test("skips row with missing agentType", async () => {
    process.env["LOOP_INGEST_URL"] = "http://h.example.com";
    process.env["LOOP_INGEST_TOKEN"] = "lrt_tok";
    const badRow = { ...BASE_ROW, agentType: undefined, stopTs: "2026-06-22T10:00:00.000Z" };
    const result = await postAgentCompletions({ sliceId: "SLICE-6", agents: [badRow] });
    expect(fetchCalls.length).toBe(0);
    expect(result.skipped).toBe(1);
  });

  test("counts failed when fetch returns non-ok status", async () => {
    globalThis.fetch = (async () => new Response(null, { status: 500 })) as typeof globalThis.fetch;
    process.env["LOOP_INGEST_URL"] = "http://h.example.com";
    process.env["LOOP_INGEST_TOKEN"] = "lrt_tok";

    const result = await postAgentCompletions({ sliceId: "SLICE-7", agents: [BASE_ROW] });
    expect(result.failed).toBe(1);
    expect(result.posted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// FEAT-215: loop.json loop.ingest block (repoPath-aware)
// ---------------------------------------------------------------------------

describe("postAgentCompletions: loop.ingest block (FEAT-215)", () => {
  test("AC-1: ingest block resolves URL + appId-driven bearer with no env/plugin overrides", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: { ingest: { appId: "app-1", url: "https://ingest.example.com" } }
    });
    tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json");
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_resolved" } } })
    );

    const result = await postAgentCompletions({
      sliceId: "SLICE-1",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("https://ingest.example.com/api/v2/ingest/loop-events");
    expect(fetchCalls[0].init?.headers).toMatchObject({ authorization: "Bearer lrt_resolved" });
    expect(result).toEqual({ posted: 1, skipped: 0, failed: 0 });
  });

  test("AC-2: LOOP_INGEST_URL + LOOP_INGEST_TOKEN win over ingest block; block never consulted", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: { ingest: { appId: "app-1", url: "https://from-block.example.com" } }
    });
    process.env["LOOP_INGEST_URL"] = "http://explicit.example.com";
    process.env["LOOP_INGEST_TOKEN"] = "lrt_explicit";
    // Deliberately no tokens.json — if resolveBearer were ever called it
    // would return null, and if the block's URL leaked in fetchCalls[0].url
    // would show it.

    const result = await postAgentCompletions({
      sliceId: "SLICE-2",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("http://explicit.example.com/api/v2/ingest/loop-events");
    expect(fetchCalls[0].init?.headers).toMatchObject({ authorization: "Bearer lrt_explicit" });
    expect(result.posted).toBe(1);
  });

  test("AC-3: CLAUDE_PLUGIN_OPTION_INGEST_URL/_TOKEN win over ingest block when LOOP_INGEST_* unset", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: { ingest: { appId: "app-1", url: "https://from-block.example.com" } }
    });
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_URL"] = "http://plugin-opt.example.com";
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_TOKEN"] = "lrt_plugin_opt";

    const result = await postAgentCompletions({
      sliceId: "SLICE-3",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("http://plugin-opt.example.com/api/v2/ingest/loop-events");
    expect(fetchCalls[0].init?.headers).toMatchObject({ authorization: "Bearer lrt_plugin_opt" });
    expect(result.posted).toBe(1);
  });

  test("AC-4: ingest block outranks a shell-global ASTRARUNNER_ENV profile (load-bearing regression)", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: { ingest: { appId: "app-1", url: "https://from-block.example.com" } }
    });
    await fs.writeFile(
      path.join(tmpDir, "profiles.json"),
      JSON.stringify({
        version: 1,
        envs: {
          prod: {
            ingestUrl: "https://from-profile.example.com",
            tokensFile: "tokens.prod.json",
            label: "PROD"
          }
        }
      })
    );
    tokenStoreInternals.profilesDir = () => tmpDir;
    await fs.writeFile(
      path.join(tmpDir, "tokens.prod.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_resolved" } } })
    );
    process.env["ASTRARUNNER_ENV"] = "prod";
    // ingest.env NOT set, so effectiveEnv falls through to
    // resolveAstrarunnerEnvOption() = "prod" — exercises that branch
    // specifically while still proving the block wins on URL.

    const result = await postAgentCompletions({
      sliceId: "SLICE-4",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("https://from-block.example.com/api/v2/ingest/loop-events");
    expect(result.posted).toBe(1);
  });

  test('AC-5a: missing loop.json -> url "", token null, fail-silent no-op', async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "ingest-norepo-"));
    try {
      const result = await postAgentCompletions({
        sliceId: "SLICE-5a",
        agents: [BASE_ROW],
        repoPath: repo
      });
      expect(fetchCalls.length).toBe(0);
      expect(result).toEqual({ posted: 0, skipped: 1, failed: 0 });
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  test("AC-5b: loop.json present but no ingest key -> same fail-silent shape as 5a", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: { notifications: { enabled: false } }
    });
    const result = await postAgentCompletions({
      sliceId: "SLICE-5b",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(0);
    expect(result).toEqual({ posted: 0, skipped: 1, failed: 0 });
  });

  test("AC-5c: ingest is a string, not an object -> treated as absent", async () => {
    const repo = await withTempLoopJson(tmpDir, { loop: { ingest: "not-an-object" } });
    const result = await postAgentCompletions({
      sliceId: "SLICE-5c",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(0);
    expect(result).toEqual({ posted: 0, skipped: 1, failed: 0 });
  });

  test("AC-5d: empty-string ingest.appId is treated as absent (no webhook.appId to inherit)", async () => {
    const repo = await withTempLoopJson(tmpDir, { loop: { ingest: { appId: "" } } });
    const result = await postAgentCompletions({
      sliceId: "SLICE-5d",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(0);
    expect(result).toEqual({ posted: 0, skipped: 1, failed: 0 });
  });

  test("AC-5e: empty ingest object {} -> no appId/url, fail-silent no-op", async () => {
    const repo = await withTempLoopJson(tmpDir, { loop: { ingest: {} } });
    const result = await postAgentCompletions({
      sliceId: "SLICE-5e",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(0);
    expect(result).toEqual({ posted: 0, skipped: 1, failed: 0 });
  });

  // SLICE-140 review (Reviewer B MEDIUM): pins the documented wrong-tier hazard.
  // A committed ingest.url WITHOUT ingest.env lets the bearer's effective env
  // fall through to a shell-global ASTRARUNNER_ENV — so a fleet with
  // ASTRARUNNER_ENV=staging pairs a staging bearer with the committed url.
  // Behavior is intentional (DECISION-1: ingest.env optional); this test makes
  // the pairing explicit so a future tightening is a conscious change.
  test("Reviewer-B: ingest.url without ingest.env pairs bearer from shell-global ASTRARUNNER_ENV", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: { ingest: { appId: "app-1", url: "https://prod-url.example.com" } }
    });
    tokenStoreInternals.profilesDir = () => tmpDir;
    await fs.writeFile(
      path.join(tmpDir, "profiles.json"),
      JSON.stringify({
        version: 1,
        envs: {
          staging: { ingestUrl: "https://ignored", tokensFile: "tokens.staging.json", label: "STG" }
        }
      })
    );
    await fs.writeFile(
      path.join(tmpDir, "tokens.staging.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_staging_bearer" } } })
    );
    process.env["ASTRARUNNER_ENV"] = "staging";

    const result = await postAgentCompletions({
      sliceId: "SLICE-BNote",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(1);
    // Committed prod url + staging-tier bearer — the documented mismatch.
    expect(fetchCalls[0].url).toBe("https://prod-url.example.com/api/v2/ingest/loop-events");
    expect(fetchCalls[0].init?.headers).toMatchObject({
      authorization: "Bearer lrt_staging_bearer"
    });
    expect(result.posted).toBe(1);
  });

  test("AC-6: well-formed appId with no matching token-store entry -> skip, not a malformed-input case", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: { ingest: { appId: "app-unminted", url: "https://from-block.example.com" } }
    });
    tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json");
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "some-other-app": { bearer: "lrt_x" } } })
    );

    const result = await postAgentCompletions({
      sliceId: "SLICE-6",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(0);
    expect(result).toEqual({ posted: 0, skipped: 1, failed: 0 });

    // Distinguish from AC-5: the URL resolves fine (non-empty) — the no-op
    // above is caused solely by the token miss. Adding the missing token
    // entry and re-calling proves it.
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({
        version: 1,
        tokens: {
          "some-other-app": { bearer: "lrt_x" },
          "app-unminted": { bearer: "lrt_now_minted" }
        }
      })
    );
    const result2 = await postAgentCompletions({
      sliceId: "SLICE-6b",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(1);
    expect(result2.posted).toBe(1);
  });

  test("AC-7a: ingest inherits notifications.webhook.appId when ingest.appId is absent", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: {
        notifications: {
          webhook: { url: "https://wh.example.com", tenantId: "T", appId: "app-webhook" }
        },
        ingest: { url: "https://from-block.example.com" }
      }
    });
    tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json");
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "app-webhook": { bearer: "lrt_inherited" } } })
    );

    const result = await postAgentCompletions({
      sliceId: "SLICE-7a",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].init?.headers).toMatchObject({ authorization: "Bearer lrt_inherited" });
    expect(result.posted).toBe(1);
  });

  test("AC-7b: explicit ingest.appId overrides a divergent webhook.appId", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: {
        notifications: {
          webhook: { url: "https://wh.example.com", tenantId: "T", appId: "app-webhook" }
        },
        ingest: { appId: "app-ingest-own", url: "https://from-block.example.com" }
      }
    });
    tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json");
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({
        version: 1,
        tokens: {
          "app-webhook": { bearer: "lrt_webhook_should_not_be_used" },
          "app-ingest-own": { bearer: "lrt_ingest_own" }
        }
      })
    );

    const result = await postAgentCompletions({
      sliceId: "SLICE-7b",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].init?.headers).toMatchObject({ authorization: "Bearer lrt_ingest_own" });
    expect(result.posted).toBe(1);
  });

  test("AC-8a: a bearer/token literal in the committed ingest block is ignored", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: {
        ingest: {
          appId: "app-1",
          url: "https://from-block.example.com",
          bearer: "lrt_COMMITTED_SHOULD_NEVER_BE_USED"
        }
      }
    });
    tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json");
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_from_store" } } })
    );

    const result = await postAgentCompletions({
      sliceId: "SLICE-8a",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].init?.headers).toMatchObject({ authorization: "Bearer lrt_from_store" });
    expect(result.posted).toBe(1);
  });

  test("AC-8b: postAgentCompletions resolves ingest config from opts.repoPath, not a module-level global", async () => {
    const repoA = await fs.mkdtemp(path.join(os.tmpdir(), "ingest-repoA-"));
    const repoB = await fs.mkdtemp(path.join(os.tmpdir(), "ingest-repoB-"));
    try {
      await withTempLoopJson(repoA, {
        loop: { ingest: { appId: "app-a", url: "https://a.example.com" } }
      });
      await withTempLoopJson(repoB, {
        loop: { ingest: { appId: "app-b", url: "https://b.example.com" } }
      });
      tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json");
      await fs.writeFile(
        path.join(tmpDir, "tokens.json"),
        JSON.stringify({
          version: 1,
          tokens: { "app-a": { bearer: "lrt_a" }, "app-b": { bearer: "lrt_b" } }
        })
      );

      const resultA = await postAgentCompletions({
        sliceId: "SLICE-8b-a",
        agents: [BASE_ROW],
        repoPath: repoA
      });
      const resultB = await postAgentCompletions({
        sliceId: "SLICE-8b-b",
        agents: [BASE_ROW],
        repoPath: repoB
      });

      expect(fetchCalls.length).toBe(2);
      expect(fetchCalls[0].url).toBe("https://a.example.com/api/v2/ingest/loop-events");
      expect(fetchCalls[0].init?.headers).toMatchObject({ authorization: "Bearer lrt_a" });
      expect(fetchCalls[1].url).toBe("https://b.example.com/api/v2/ingest/loop-events");
      expect(fetchCalls[1].init?.headers).toMatchObject({ authorization: "Bearer lrt_b" });
      expect(resultA.posted).toBe(1);
      expect(resultB.posted).toBe(1);
    } finally {
      await fs.rm(repoA, { recursive: true, force: true });
      await fs.rm(repoB, { recursive: true, force: true });
    }
  });

  test("ingest.env overrides a shell-global ASTRARUNNER_ENV for BOTH the profile URL fallback and the token-store tier", async () => {
    const repo = await withTempLoopJson(tmpDir, {
      loop: { ingest: { appId: "app-1", env: "staging" } }
    });
    tokenStoreInternals.profilesDir = () => tmpDir;
    await fs.writeFile(
      path.join(tmpDir, "profiles.json"),
      JSON.stringify({
        version: 1,
        envs: {
          staging: {
            ingestUrl: "https://staging.example.com",
            tokensFile: "tokens.staging.json",
            label: "Stage"
          },
          prod: {
            ingestUrl: "https://prod.example.com",
            tokensFile: "tokens.prod.json",
            label: "Prod"
          }
        }
      })
    );
    await fs.writeFile(
      path.join(tmpDir, "tokens.staging.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_staging" } } })
    );
    await fs.writeFile(
      path.join(tmpDir, "tokens.prod.json"),
      JSON.stringify({ version: 1, tokens: { "app-1": { bearer: "lrt_prod" } } })
    );
    process.env["ASTRARUNNER_ENV"] = "prod"; // shell-global, must be overridden by ingest.env

    const result = await postAgentCompletions({
      sliceId: "SLICE-ENV",
      agents: [BASE_ROW],
      repoPath: repo
    });
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("https://staging.example.com/api/v2/ingest/loop-events");
    expect(fetchCalls[0].init?.headers).toMatchObject({ authorization: "Bearer lrt_staging" });
    expect(result.posted).toBe(1);
  });
});
