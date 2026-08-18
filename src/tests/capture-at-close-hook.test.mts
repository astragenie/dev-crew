import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Tests for hooks/capture-at-close.mjs — the SubagentStop / SessionEnd hook
// that invokes `astramem-local capture claude <transcript-path> --event
// <kind>` synchronously at close (runner-plugin#394), before any
// worktree/subagent cleanup can delete the transcript out from under a
// deferred reader. Every test spawns the real hook process (not an
// in-process mock) so the fail-open contract is verified the same way the
// hook actually runs under Claude Code: stdin JSON in, exit code + stderr
// out, real child-process spawn for the CLI probe/invocation.

function resolveHookPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "hooks", "capture-at-close.mjs");
}

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeLoopConfig(repo: string, config: unknown): Promise<void> {
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repo, ".claude", "loop.json"), JSON.stringify(config, null, 2));
}

async function writeFakeTranscript(repo: string, name: string): Promise<string> {
  const p = path.join(repo, name);
  await fs.writeFile(p, '{"type":"assistant"}\n');
  return p;
}

/** Writes a fake `astramem-local` script that records its argv to `logPath`
 * and exits with `exitCode`. `capture-at-close.mjs` spawns the resolved CLI
 * path directly (not `node <script>`), so on Windows the returned path is a
 * `.cmd` shim delegating to the `.mjs` logic; on POSIX it's the script
 * itself with the executable bit set and a `node` shebang. */
async function writeFakeCli(
  repo: string,
  opts: { exitCode?: number; hangMs?: number } = {}
): Promise<string> {
  const scriptPath = path.join(repo, "fake-astramem-local.mjs");
  const logPath = path.join(repo, "fake-cli-calls.jsonl");
  const exitCode = opts.exitCode ?? 0;
  const hangMs = opts.hangMs ?? 0;
  await fs.writeFile(
    scriptPath,
    `import fs from "node:fs";
fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(process.argv.slice(2)) + "\\n");
${hangMs > 0 ? `await new Promise((r) => setTimeout(r, ${hangMs}));` : ""}
process.exit(${exitCode});
`
  );

  if (process.platform === "win32") {
    const shimPath = path.join(repo, "fake-astramem-local.cmd");
    await fs.writeFile(shimPath, `@echo off\r\nnode "${scriptPath}" %*\r\n`);
    return shimPath;
  }

  await fs.chmod(scriptPath, 0o755);
  const shebangPath = path.join(repo, "fake-astramem-local");
  await fs.writeFile(shebangPath, `#!/usr/bin/env node\n${await fs.readFile(scriptPath, "utf8")}`);
  await fs.chmod(shebangPath, 0o755);
  return shebangPath;
}

function runHook(
  repo: string,
  payload: Record<string, unknown>,
  extraEnv: Record<string, string> = {}
): { status: number | null; stdout: string; stderr: string } {
  const hookPath = resolveHookPath();
  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify({ cwd: repo, ...payload }),
    encoding: "utf8",
    env: {
      ...process.env,
      ASTRAMEM_DISABLE_PATH_PROBE: "1",
      ASTRAMEM_LOCAL_CLI: "",
      CAPTURE_AT_CLOSE_TIMEOUT_MS: "500",
      ...extraEnv
    }
  });
  return { status: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
}

async function readCliCalls(repo: string): Promise<string[][]> {
  try {
    const raw = await fs.readFile(path.join(repo, "fake-cli-calls.jsonl"), "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

describe("capture-at-close.mjs — config gate", () => {
  test("memory block absent -> no-op, CLI never invoked", async () => {
    const repo = await tmpRepo("capture-noconfig-");
    const transcript = await writeFakeTranscript(repo, "agent.jsonl");
    const cli = await writeFakeCli(repo);

    const result = runHook(
      repo,
      { hook_event_name: "SubagentStop", agent_transcript_path: transcript },
      { ASTRAMEM_LOCAL_CLI: cli }
    );
    expect(result.status).toBe(0);
    expect(await readCliCalls(repo)).toEqual([]);
  });

  test('memory.enabled = "never" -> no-op, CLI never invoked', async () => {
    const repo = await tmpRepo("capture-never-");
    await writeLoopConfig(repo, { memory: { enabled: "never" } });
    const transcript = await writeFakeTranscript(repo, "agent.jsonl");
    const cli = await writeFakeCli(repo);

    const result = runHook(
      repo,
      { hook_event_name: "SubagentStop", agent_transcript_path: transcript },
      { ASTRAMEM_LOCAL_CLI: cli }
    );
    expect(result.status).toBe(0);
    expect(await readCliCalls(repo)).toEqual([]);
  });

  test('memory.enabled = "auto" -> gate passes, CLI is invoked', async () => {
    const repo = await tmpRepo("capture-auto-");
    await writeLoopConfig(repo, { memory: { enabled: "auto" } });
    const transcript = await writeFakeTranscript(repo, "agent.jsonl");
    const cli = await writeFakeCli(repo);

    const result = runHook(
      repo,
      { hook_event_name: "SubagentStop", agent_transcript_path: transcript },
      { ASTRAMEM_LOCAL_CLI: cli }
    );
    expect(result.status).toBe(0);
    const calls = await readCliCalls(repo);
    expect(calls.length).toBe(1);
  });
});

describe("capture-at-close.mjs — event/transcript field resolution", () => {
  test("SubagentStop reads agent_transcript_path and passes --event subagent_stop", async () => {
    const repo = await tmpRepo("capture-subagent-");
    await writeLoopConfig(repo, { memory: { enabled: "auto" } });
    const transcript = await writeFakeTranscript(repo, "sub.jsonl");
    const cli = await writeFakeCli(repo);

    const result = runHook(
      repo,
      {
        hook_event_name: "SubagentStop",
        transcript_path: path.join(repo, "MAIN-SHOULD-NOT-BE-USED.jsonl"),
        agent_transcript_path: transcript
      },
      { ASTRAMEM_LOCAL_CLI: cli }
    );
    expect(result.status).toBe(0);
    const calls = await readCliCalls(repo);
    expect(calls).toEqual([["capture", "claude", transcript, "--event", "subagent_stop"]]);
  });

  test("SessionEnd reads transcript_path and passes --event session_end", async () => {
    const repo = await tmpRepo("capture-sessionend-");
    await writeLoopConfig(repo, { memory: { enabled: "auto" } });
    const transcript = await writeFakeTranscript(repo, "main.jsonl");
    const cli = await writeFakeCli(repo);

    const result = runHook(
      repo,
      { hook_event_name: "SessionEnd", transcript_path: transcript },
      { ASTRAMEM_LOCAL_CLI: cli }
    );
    expect(result.status).toBe(0);
    const calls = await readCliCalls(repo);
    expect(calls).toEqual([["capture", "claude", transcript, "--event", "session_end"]]);
  });

  test("unrecognized hook_event_name -> no-op", async () => {
    const repo = await tmpRepo("capture-unknown-event-");
    await writeLoopConfig(repo, { memory: { enabled: "auto" } });
    const transcript = await writeFakeTranscript(repo, "x.jsonl");
    const cli = await writeFakeCli(repo);

    const result = runHook(
      repo,
      { hook_event_name: "Stop", transcript_path: transcript },
      { ASTRAMEM_LOCAL_CLI: cli }
    );
    expect(result.status).toBe(0);
    expect(await readCliCalls(repo)).toEqual([]);
  });
});

describe("capture-at-close.mjs — fail-open behavior", () => {
  test("transcript path missing entirely -> no-op, exit 0", async () => {
    const repo = await tmpRepo("capture-notranscript-");
    await writeLoopConfig(repo, { memory: { enabled: "auto" } });
    const cli = await writeFakeCli(repo);

    const result = runHook(repo, { hook_event_name: "SubagentStop" }, { ASTRAMEM_LOCAL_CLI: cli });
    expect(result.status).toBe(0);
    expect(await readCliCalls(repo)).toEqual([]);
  });

  test("transcript file does not exist on disk -> no-op, exit 0, CLI not spawned", async () => {
    const repo = await tmpRepo("capture-deleted-");
    await writeLoopConfig(repo, { memory: { enabled: "auto" } });
    const cli = await writeFakeCli(repo);
    const goneTranscript = path.join(repo, "already-cleaned-up.jsonl");

    const result = runHook(
      repo,
      { hook_event_name: "SubagentStop", agent_transcript_path: goneTranscript },
      { ASTRAMEM_LOCAL_CLI: cli }
    );
    expect(result.status).toBe(0);
    expect(await readCliCalls(repo)).toEqual([]);
  });

  test("CLI binary unresolvable -> no-op, exit 0, no stderr alarm", async () => {
    const repo = await tmpRepo("capture-nocli-");
    await writeLoopConfig(repo, { memory: { enabled: "auto" } });
    const transcript = await writeFakeTranscript(repo, "agent.jsonl");

    const result = runHook(repo, {
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript
    });
    expect(result.status).toBe(0);
  });

  test("CLI exits non-zero -> exit 0, warning on stderr, never blocks", async () => {
    const repo = await tmpRepo("capture-clifail-");
    await writeLoopConfig(repo, { memory: { enabled: "auto" } });
    const transcript = await writeFakeTranscript(repo, "agent.jsonl");
    const cli = await writeFakeCli(repo, { exitCode: 1 });

    const result = runHook(
      repo,
      { hook_event_name: "SubagentStop", agent_transcript_path: transcript },
      { ASTRAMEM_LOCAL_CLI: cli }
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("capture-at-close");
    expect(result.stderr).not.toContain("undefined");
  });

  test("CLI hangs past the timeout -> hook still exits 0 within the cap", async () => {
    const repo = await tmpRepo("capture-timeout-");
    await writeLoopConfig(repo, { memory: { enabled: "auto" } });
    const transcript = await writeFakeTranscript(repo, "agent.jsonl");
    const cli = await writeFakeCli(repo, { hangMs: 60_000 });

    const start = Date.now();
    const result = runHook(
      repo,
      { hook_event_name: "SubagentStop", agent_transcript_path: transcript },
      { ASTRAMEM_LOCAL_CLI: cli, CAPTURE_AT_CLOSE_TIMEOUT_MS: "300" }
    );
    const elapsed = Date.now() - start;
    expect(result.status).toBe(0);
    expect(elapsed).toBeLessThan(5000);
    expect(result.stderr).toContain("timeout");
  });

  test("malformed stdin -> no-op, exit 0", () => {
    const hookPath = resolveHookPath();
    const result = spawnSync(process.execPath, [hookPath], {
      input: "not json",
      encoding: "utf8",
      env: { ...process.env, ASTRAMEM_DISABLE_PATH_PROBE: "1" }
    });
    expect(result.status).toBe(0);
  });
});
