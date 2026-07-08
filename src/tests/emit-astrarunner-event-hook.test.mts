import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Tests for hooks/emit-astrarunner-event.mjs — the generalized AstraRunner
// dev-activity emitter (SessionStart / SubagentStart / SubagentStop /
// TaskCreated / TaskCompleted). The hook process itself only does synchronous
// gate work and always exits fast; the actual POST happens in a detached
// child, so these tests spin up a real localhost HTTP server and poll it for
// the request rather than mocking `fetch` in-process (the child is a
// separate `node` process — an in-process fetch mock cannot reach it).

function resolveHookPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "hooks", "emit-astrarunner-event.mjs");
}

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeLoopConfig(repo: string, config: unknown): Promise<void> {
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repo, ".claude", "loop.json"), JSON.stringify(config, null, 2));
}

interface CapturedRequest {
  method?: string;
  url?: string;
  authorization?: string;
  body: string;
}

function startCaptureServer(): Promise<{ port: number; close: () => Promise<void>; wait: () => Promise<CapturedRequest | null> }> {
  return new Promise((resolve) => {
    let captured: CapturedRequest | null = null;
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        captured = {
          method: req.method,
          url: req.url,
          authorization: req.headers.authorization,
          body
        };
        res.writeHead(202);
        res.end();
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        close: () => new Promise((r) => server.close(() => r())),
        wait: async () => {
          const deadline = Date.now() + 3000;
          while (Date.now() < deadline) {
            if (captured) return captured;
            await new Promise((r) => setTimeout(r, 50));
          }
          return captured;
        }
      });
    });
  });
}

function runHook(
  repo: string,
  eventKind: string,
  extraEnv: Record<string, string> = {}
): { status: number | null; stdout: string; stderr: string } {
  const hookPath = resolveHookPath();
  const result = spawnSync(process.execPath, [hookPath, eventKind], {
    input: JSON.stringify({ cwd: repo }),
    encoding: "utf8",
    env: {
      ...process.env,
      // Explicitly clear ambient ingest env so tests are isolated from any
      // real local dev config.
      LOOP_INGEST_URL: "",
      LOOP_INGEST_TOKEN: "",
      CLAUDE_PLUGIN_OPTION_INGEST_URL: "",
      CLAUDE_PLUGIN_OPTION_INGEST_TOKEN: "",
      ASTRARUNNER_ENV: "",
      CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV: "",
      ...extraEnv
    }
  });
  return { status: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
}

const servers: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (servers.length > 0) {
    const close = servers.pop();
    if (close) await close();
  }
});

describe("emit-astrarunner-event.mjs — gate no-op", () => {
  test("no env, no loop.json ingest signal -> exits 0 immediately, no output, no request", async () => {
    const repo = await tmpRepo("emit-noop-");
    const srv = await startCaptureServer();
    servers.push(srv.close);

    const result = runHook(repo, "session_start", {
      LOOP_INGEST_URL: `http://127.0.0.1:${srv.port}`
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");

    const captured = await srv.wait();
    expect(captured).toBeNull();
  });

  test("loop.json present but carries no ingest/webhook appId -> no-op", async () => {
    const repo = await tmpRepo("emit-noop-loopjson-");
    await writeLoopConfig(repo, { loop: { marathonMode: true } });
    const srv = await startCaptureServer();
    servers.push(srv.close);

    const result = runHook(repo, "task_created", {
      LOOP_INGEST_URL: `http://127.0.0.1:${srv.port}`
    });
    expect(result.status).toBe(0);

    const captured = await srv.wait();
    expect(captured).toBeNull();
  });
});

describe("emit-astrarunner-event.mjs — explicit env drives a real POST", () => {
  test("LOOP_INGEST_URL + LOOP_INGEST_TOKEN -> flat {kind,emittedAt,repoPath} envelope with Bearer auth", async () => {
    const repo = await tmpRepo("emit-explicit-");
    const srv = await startCaptureServer();
    servers.push(srv.close);

    const result = runHook(repo, "subagent_start", {
      LOOP_INGEST_URL: `http://127.0.0.1:${srv.port}`,
      LOOP_INGEST_TOKEN: "lrt_test_token"
    });
    expect(result.status).toBe(0);

    const captured = await srv.wait();
    expect(captured).not.toBeNull();
    expect(captured?.method).toBe("POST");
    expect(captured?.url).toBe("/api/v2/ingest/loop-events");
    expect(captured?.authorization).toBe("Bearer lrt_test_token");

    const envelope = JSON.parse(captured?.body ?? "{}");
    expect(envelope.kind).toBe("subagent_start");
    expect(envelope.repoPath).toBe(repo);
    expect(typeof envelope.emittedAt).toBe("string");
    expect(() => new Date(envelope.emittedAt).toISOString()).not.toThrow();
    expect(Object.keys(envelope).sort()).toEqual(["emittedAt", "kind", "repoPath"]);
  });

  test("CLAUDE_PLUGIN_OPTION_INGEST_* (plugin-manager options) also drive a POST", async () => {
    const repo = await tmpRepo("emit-plugin-option-");
    const srv = await startCaptureServer();
    servers.push(srv.close);

    const result = runHook(repo, "subagent_stop", {
      CLAUDE_PLUGIN_OPTION_INGEST_URL: `http://127.0.0.1:${srv.port}`,
      CLAUDE_PLUGIN_OPTION_INGEST_TOKEN: "lrt_plugin_opt"
    });
    expect(result.status).toBe(0);

    const captured = await srv.wait();
    expect(captured).not.toBeNull();
    expect(captured?.authorization).toBe("Bearer lrt_plugin_opt");
    const envelope = JSON.parse(captured?.body ?? "{}");
    expect(envelope.kind).toBe("subagent_stop");
  });

  test("URL present but token missing -> no-op, no request", async () => {
    const repo = await tmpRepo("emit-no-token-");
    const srv = await startCaptureServer();
    servers.push(srv.close);

    const result = runHook(repo, "task_completed", {
      LOOP_INGEST_URL: `http://127.0.0.1:${srv.port}`
    });
    expect(result.status).toBe(0);

    const captured = await srv.wait();
    expect(captured).toBeNull();
  });
});

describe("emit-astrarunner-event.mjs — loop.json loop.ingest committed URL", () => {
  test("loop.ingest.url (no env token) resolves URL; explicit token still required", async () => {
    const repo = await tmpRepo("emit-committed-url-");
    const srv = await startCaptureServer();
    servers.push(srv.close);
    await writeLoopConfig(repo, { loop: { ingest: { url: `http://127.0.0.1:${srv.port}` } } });

    // No token anywhere resolvable (no explicit env, no appId in loop.json) ->
    // the gate itself sees no signal (ingest.url alone, no appId) and should
    // still no-op since ingest.url without appId cannot resolve a bearer.
    const result = runHook(repo, "session_start", {});
    expect(result.status).toBe(0);
    const captured = await srv.wait();
    expect(captured).toBeNull();
  });

  test("loop.ingest.url + explicit LOOP_INGEST_TOKEN -> posts to the committed URL", async () => {
    const repo = await tmpRepo("emit-committed-url-token-");
    const srv = await startCaptureServer();
    servers.push(srv.close);
    await writeLoopConfig(repo, { loop: { ingest: { url: `http://127.0.0.1:${srv.port}` } } });

    const result = runHook(repo, "session_start", { LOOP_INGEST_TOKEN: "lrt_committed" });
    expect(result.status).toBe(0);

    const captured = await srv.wait();
    expect(captured).not.toBeNull();
    expect(captured?.authorization).toBe("Bearer lrt_committed");
    const envelope = JSON.parse(captured?.body ?? "{}");
    expect(envelope.kind).toBe("session_start");
  });
});
