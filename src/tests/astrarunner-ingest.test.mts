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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
let originalFetch: typeof globalThis.fetch;
let fetchCalls: Array<{ url: string; init?: RequestInit }>;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ingest-test-"));
  originalProfilesDir = profilesInternals.profilesDir;
  profilesInternals.profilesDir = () => tmpDir;

  fetchCalls = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    fetchCalls.push({ url: typeof url === "string" ? url : url.toString(), init });
    return new Response(null, { status: 202 });
  }) as typeof globalThis.fetch;

  delete process.env["ASTRARUNNER_ENV"];
  delete process.env["LOOP_INGEST_URL"];
  delete process.env["LOOP_INGEST_TOKEN"];
});

afterEach(async () => {
  profilesInternals.profilesDir = originalProfilesDir;
  globalThis.fetch = originalFetch;
  delete process.env["ASTRARUNNER_ENV"];
  delete process.env["LOOP_INGEST_URL"];
  delete process.env["LOOP_INGEST_TOKEN"];
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
