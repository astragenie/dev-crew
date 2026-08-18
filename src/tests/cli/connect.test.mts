// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { run, _internals } from "../../scripts/cli/connect.mjs";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Helper for building run options with captured output
function makeIO2(argv: string[]): {
  argv: string[];
  outLines: string[];
  errLines: string[];
  stdout: { write: (s: string) => void };
  stderr: { write: (s: string) => void };
} {
  const outLines: string[] = [];
  const errLines: string[] = [];
  return {
    argv,
    outLines,
    errLines,
    stdout: {
      write: (s: string) => {
        outLines.push(s);
      }
    },
    stderr: {
      write: (s: string) => {
        errLines.push(s);
      }
    }
  };
}

/** Build a profiles.json with one or more entries. */
async function seedProfiles(dir: string, envs: Record<string, object>): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "profiles.json"), JSON.stringify({ version: 1, envs }), "utf8");
}

/** Build a tokens.<env>.json with pre-existing entries. */
async function seedTokens(
  dir: string,
  file: string,
  tokens: Record<string, object>
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, file), JSON.stringify({ version: 1, tokens }), "utf8");
}

/** Build a .claude/loop.json in a repo dir. */
async function seedLoopJson(repoDir: string, content: object): Promise<void> {
  await fs.mkdir(path.join(repoDir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repoDir, ".claude", "loop.json"), JSON.stringify(content), "utf8");
}

async function readLoopJson(repoDir: string): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(path.join(repoDir, ".claude", "loop.json"), "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

async function readTokensFile(
  dir: string,
  file: string
): Promise<{ version: number; tokens: Record<string, unknown> }> {
  const raw = await fs.readFile(path.join(dir, file), "utf8");
  return JSON.parse(raw) as { version: number; tokens: Record<string, unknown> };
}

// ─── Fixture fetch ────────────────────────────────────────────────────────────

type FetchCall = { url: string; init?: RequestInit };

function mockFetch(
  redeemStatus: number,
  redeemBody: object | null,
  handshakeStatus = 202
): { fetchFn: typeof globalThis.fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof url === "string" ? url : url.toString();
    calls.push({ url: urlStr, init });

    if (urlStr.includes("/api/v2/claims/")) {
      return new Response(redeemBody !== null ? JSON.stringify(redeemBody) : null, {
        status: redeemStatus,
        headers: { "Content-Type": "application/json" }
      });
    }
    // handshake or other POSTs
    return new Response(null, { status: handshakeStatus });
  }) as unknown as typeof globalThis.fetch;

  return { fetchFn, calls };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("connect CLI", () => {
  let tmpHome: string;
  let tmpRepo: string;
  const saved = {
    profilesDir: _internals.profilesDir,
    env: _internals.env,
    cwd: _internals.cwd,
    fetch: _internals.fetch,
    isTTY: _internals.isTTY,
    prompt: _internals.prompt
  };

  beforeEach(async () => {
    tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "connect-home-"));
    tmpRepo = await fs.mkdtemp(path.join(os.tmpdir(), "connect-repo-"));

    // Override internals to use tmpdir instead of real homedir
    _internals.profilesDir = () => tmpHome;
    _internals.env = () => ({}) as NodeJS.ProcessEnv; // clear env vars
    _internals.cwd = () => tmpRepo;
    _internals.isTTY = () => false; // non-TTY by default
    _internals.prompt = async () => "";
  });

  afterEach(async () => {
    // Restore
    _internals.profilesDir = saved.profilesDir;
    _internals.env = saved.env;
    _internals.cwd = saved.cwd;
    _internals.fetch = saved.fetch;
    _internals.isTTY = saved.isTTY;
    _internals.prompt = saved.prompt;

    await fs.rm(tmpHome, { recursive: true, force: true });
    await fs.rm(tmpRepo, { recursive: true, force: true });
  });

  // ── AC1: happy path ─────────────────────────────────────────────────────
  test("AC1: valid code + populated profiles.json + no loop.json → creates tokens file + loop.json + exit 0", async () => {
    await seedProfiles(tmpHome, {
      local: { ingestUrl: "http://localhost:5137", tokensFile: "tokens.local.json", label: "Local" }
    });

    const redeemResp = {
      ingestUrl: "http://localhost:5137",
      appId: "app-abc",
      tenantId: "tenant-xyz",
      bearer: "lrt_test_token"
    };
    const { fetchFn } = mockFetch(200, redeemResp);
    _internals.fetch = fetchFn as typeof _internals.fetch;

    const io = makeIO2(["ABCD-1234", "--env", "local"]);
    const code = await run(io);

    expect(code).toBe(0);
    expect(io.outLines.join("")).toContain("Connected app app-abc");
    expect(io.outLines.join("")).toContain("local tier");

    // tokens.local.json created with entry
    const tokens = await readTokensFile(tmpHome, "tokens.local.json");
    expect(tokens.tokens["app-abc"]).toBeTruthy();
    const entry = tokens.tokens["app-abc"] as { bearer: string; label: string; repoPath: string };
    expect(entry.bearer).toBe("lrt_test_token");
    expect(entry.label).toMatch(/^claim-\d{14}$/);
    expect(entry.repoPath).toBe(tmpRepo);

    // .claude/loop.json scaffolded
    const loopJson = await readLoopJson(tmpRepo);
    const webhook = (loopJson.loop as Record<string, unknown>)?.notifications as
      | Record<string, unknown>
      | undefined;
    expect(webhook?.enabled).toBe(true);
    expect(webhook?.mode).toBe("webhook");
    const wh = webhook?.webhook as Record<string, unknown> | undefined;
    expect(wh?.url).toBe("http://localhost:5137");
    expect(wh?.tenantId).toBe("tenant-xyz");
    expect(wh?.appId).toBe("app-abc");
    expect(wh?.bearer).toBeUndefined(); // Pattern B
  });

  // ── AC2: 410 expired claim ───────────────────────────────────────────────
  test("AC2: 410 from redeem → stderr expired + exit 1 + no files touched", async () => {
    await seedProfiles(tmpHome, {
      prod: { ingestUrl: "https://example.com", tokensFile: "tokens.prod.json", label: "Prod" }
    });

    const { fetchFn } = mockFetch(410, { error: "claim_gone", message: "expired" });
    _internals.fetch = fetchFn as typeof _internals.fetch;

    const io = makeIO2(["XXXX-YYYY", "--env", "prod"]);
    const code = await run(io);

    expect(code).toBe(1);
    expect(io.errLines.join("")).toContain("expired or invalid");

    // No files created
    const tokensExists = await fs
      .access(path.join(tmpHome, "tokens.prod.json"))
      .then(() => true)
      .catch(() => false);
    expect(tokensExists).toBe(false);

    const loopExists = await fs
      .access(path.join(tmpRepo, ".claude", "loop.json"))
      .then(() => true)
      .catch(() => false);
    expect(loopExists).toBe(false);
  });

  // ── AC3: single profiles.json entry auto-selected ───────────────────────
  test("AC3: profiles.json has 1 entry, no --env flag, no env-var → resolves to that env without prompting", async () => {
    await seedProfiles(tmpHome, {
      local: { ingestUrl: "http://localhost:5137", tokensFile: "tokens.local.json", label: "Local" }
    });

    const redeemResp = {
      ingestUrl: "http://localhost:5137",
      appId: "app-single",
      tenantId: "t1",
      bearer: "lrt_single"
    };
    const { fetchFn } = mockFetch(200, redeemResp);
    _internals.fetch = fetchFn as typeof _internals.fetch;

    // no --env, no env var, non-TTY
    _internals.prompt = async () => {
      throw new Error("prompt should not be called");
    };

    const io = makeIO2(["ABCD-1234"]); // no --env
    const code = await run(io);

    expect(code).toBe(0);
    expect(io.outLines.join("")).toContain("local tier");

    // tokens.local.json should exist
    const tokens = await readTokensFile(tmpHome, "tokens.local.json");
    expect(tokens.tokens["app-single"]).toBeTruthy();
  });

  // ── AC4: --env staging, profiles.json missing staging → exit 4 ──────────
  test("AC4: --env staging with no staging profile → stderr profile not found + exit 4", async () => {
    await seedProfiles(tmpHome, {
      prod: { ingestUrl: "https://example.com", tokensFile: "tokens.prod.json", label: "Prod" }
    });

    const { fetchFn } = mockFetch(200, {}); // should never be called
    _internals.fetch = fetchFn as typeof _internals.fetch;

    const io = makeIO2(["ABCD-1234", "--env", "staging"]);
    const code = await run(io);

    expect(code).toBe(4);
    expect(io.errLines.join("")).toContain("profile 'staging' not found");
  });

  // ── AC5: handshake POST fired ────────────────────────────────────────────
  test("AC5: successful redeem fires exactly one client.handshake POST", async () => {
    await seedProfiles(tmpHome, {
      prod: { ingestUrl: "https://example.com", tokensFile: "tokens.prod.json", label: "Prod" }
    });

    const redeemResp = {
      ingestUrl: "https://example.com",
      appId: "app-hs",
      tenantId: "t-hs",
      bearer: "lrt_hs"
    };
    const { fetchFn, calls } = mockFetch(200, redeemResp, 202);
    _internals.fetch = fetchFn as typeof _internals.fetch;

    const io = makeIO2(["ABCD-1234", "--env", "prod"]);
    const code = await run(io);

    expect(code).toBe(0);

    // Filter to handshake calls (loop-events endpoint)
    const handshakeCalls = calls.filter((c) => c.url.includes("/api/v2/ingest/loop-events"));
    expect(handshakeCalls.length).toBe(1);

    const body = JSON.parse(String(handshakeCalls[0].init?.body)) as Record<string, unknown>;
    expect(body.kind).toBe("client.handshake");
    expect((body.payload as Record<string, unknown>)?.repoPath).toBe(tmpRepo);
    expect(handshakeCalls[0].init?.headers).toMatchObject({
      Authorization: "Bearer lrt_hs"
    });
  });

  // ── AC6: existing token entries preserved ────────────────────────────────
  test("AC6: pre-seeded tokens file keeps all 2 existing entries after appending new one", async () => {
    await seedProfiles(tmpHome, {
      local: { ingestUrl: "http://localhost:5137", tokensFile: "tokens.local.json", label: "Local" }
    });

    // Pre-seed with 2 existing entries
    await seedTokens(tmpHome, "tokens.local.json", {
      "existing-app-1": { bearer: "lrt_existing_1", label: "old-1", repoPath: "/repo1" },
      "existing-app-2": { bearer: "lrt_existing_2", label: "old-2", repoPath: "/repo2" }
    });

    const redeemResp = {
      ingestUrl: "http://localhost:5137",
      appId: "new-app-3",
      tenantId: "t-multi",
      bearer: "lrt_new_3"
    };
    const { fetchFn } = mockFetch(200, redeemResp);
    _internals.fetch = fetchFn as typeof _internals.fetch;

    const io = makeIO2(["ABCD-1234", "--env", "local"]);
    const code = await run(io);

    expect(code).toBe(0);

    const tokens = await readTokensFile(tmpHome, "tokens.local.json");
    // All 3 entries present
    expect(Object.keys(tokens.tokens).length).toBe(3);
    expect(tokens.tokens["existing-app-1"]).toBeTruthy();
    expect(tokens.tokens["existing-app-2"]).toBeTruthy();
    const newEntry = tokens.tokens["new-app-3"] as { bearer: string };
    expect(newEntry.bearer).toBe("lrt_new_3");
  });

  // ── AC7: loop.json unrelated keys preserved ──────────────────────────────
  test("AC7: pre-seeded loop.json with cost key → webhook block added AND cost block preserved", async () => {
    await seedProfiles(tmpHome, {
      prod: { ingestUrl: "https://example.com", tokensFile: "tokens.prod.json", label: "Prod" }
    });

    // Pre-seed loop.json with unrelated key
    await seedLoopJson(tmpRepo, {
      loop: {
        cost: { ceilingUsd: 5.0 },
        marathonMode: true
      }
    });

    const redeemResp = {
      ingestUrl: "https://example.com",
      appId: "app-preserve",
      tenantId: "t-preserve",
      bearer: "lrt_preserve"
    };
    const { fetchFn } = mockFetch(200, redeemResp);
    _internals.fetch = fetchFn as typeof _internals.fetch;

    const io = makeIO2(["ABCD-1234", "--env", "prod"]);
    const code = await run(io);

    expect(code).toBe(0);

    const loopJson = await readLoopJson(tmpRepo);
    const loopBlock = loopJson.loop as Record<string, unknown>;

    // Cost block preserved
    expect((loopBlock.cost as Record<string, unknown>)?.ceilingUsd).toBe(5.0);
    expect(loopBlock.marathonMode).toBe(true);

    // Webhook block written
    const notifications = loopBlock.notifications as Record<string, unknown>;
    expect(notifications?.enabled).toBe(true);
    expect(notifications?.mode).toBe("webhook");
    const wh = notifications?.webhook as Record<string, unknown>;
    expect(wh?.url).toBe("https://example.com");
    expect(wh?.appId).toBe("app-preserve");
  });

  // ── Bonus: fs write failure → exit 3 ────────────────────────────────────
  test("bonus: fs write failure on tokens file → exit 3", async () => {
    await seedProfiles(tmpHome, {
      prod: { ingestUrl: "https://example.com", tokensFile: "tokens.prod.json", label: "Prod" }
    });

    const redeemResp = {
      ingestUrl: "https://example.com",
      appId: "app-fs-fail",
      tenantId: "t-fs",
      bearer: "lrt_fs"
    };
    const { fetchFn } = mockFetch(200, redeemResp);
    _internals.fetch = fetchFn as typeof _internals.fetch;

    // Make tokensFile path a directory so write fails
    await fs.mkdir(path.join(tmpHome, "tokens.prod.json"), { recursive: true });

    const io = makeIO2(["ABCD-1234", "--env", "prod"]);
    const code = await run(io);

    expect(code).toBe(3);
    expect(io.errLines.join("")).toContain("failed to write token store");
  });

  // ── --help ───────────────────────────────────────────────────────────────
  test("--help prints usage and exits 0", async () => {
    const io = makeIO2(["--help"]);
    const code = await run(io);

    expect(code).toBe(0);
    expect(io.outLines.join("")).toContain("bunx astrarunner connect");
    expect(io.outLines.join("")).toContain("--env");
  });

  // ── missing code ─────────────────────────────────────────────────────────
  test("missing <code> arg → exits 1 with usage hint", async () => {
    const io = makeIO2(["--env", "prod"]);
    const code = await run(io);

    expect(code).toBe(1);
    expect(io.errLines.join("")).toContain("required");
  });
});
