// Tests for src/scripts/lib/memory-sink.mts (FEAT-217).
// A capturing fake `astramem` CLI is injected via CLAUDE_PLUGIN_ROOT_MEMORY so
// no real astramem process is ever spawned. Every path must be fail-silent.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _resetCliCache } from "../scripts/lib/memory-bridge.mjs";
import {
  readMemoryConfig,
  recordDecision,
  recordLesson,
  recordMemory,
  recordNote
} from "../scripts/lib/memory-sink.mjs";

const isWin = process.platform === "win32";

let tmpDir: string;
let repoDir: string;
let cliRoot: string;
let argsFile: string;
let origPluginRoot: string | undefined;

/** Write a repo dir with .claude/loop.json holding the given memory block. */
async function writeRepo(memory: unknown): Promise<string> {
  const dir = await fs.mkdtemp(path.join(tmpDir, "repo-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  const loopJson = memory === undefined ? {} : { memory };
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify(loopJson));
  return dir;
}

/** Install a fake astramem CLI that appends its argv (JSON) to argsFile.
 * POSIX only writes reliably; on Windows we install a no-op .cmd and skip the
 * argv-capture assertions (spawn still exercises the enable/resolve path). */
async function installCapturingCli(): Promise<void> {
  const binDir = path.join(cliRoot, "bin");
  await fs.mkdir(binDir, { recursive: true });
  if (isWin) {
    await fs.writeFile(path.join(binDir, "astramem.cmd"), "@echo off\n");
    return;
  }
  const cli = path.join(binDir, "astramem");
  await fs.writeFile(
    cli,
    `#!/bin/sh\nnode -e "require('fs').appendFileSync(process.argv[1], JSON.stringify(process.argv.slice(2))+'\\n')" "${argsFile}" "$@"\n`
  );
  await fs.chmod(cli, 0o755);
}

async function readCaptured(): Promise<string[][]> {
  try {
    const raw = await fs.readFile(argsFile, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as string[]);
  } catch {
    return [];
  }
}

beforeEach(async () => {
  _resetCliCache();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "memsink-"));
  cliRoot = await fs.mkdtemp(path.join(tmpDir, "cliroot-"));
  argsFile = path.join(tmpDir, "captured.jsonl");
  origPluginRoot = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
});

afterEach(async () => {
  _resetCliCache();
  if (origPluginRoot !== undefined) process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = origPluginRoot;
  else delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("readMemoryConfig", () => {
  test("missing loop.json defaults to off (opt-in)", async () => {
    const cfg = await readMemoryConfig(path.join(tmpDir, "does-not-exist"));
    expect(cfg.mode).toBe("off");
  });

  test("loop.json with no memory block -> off (opt-in)", async () => {
    repoDir = await writeRepo(undefined);
    const cfg = await readMemoryConfig(repoDir);
    expect(cfg.mode).toBe("off");
  });

  test("project falls back to productName when memory.project is absent", async () => {
    const dir = await fs.mkdtemp(path.join(tmpDir, "repo-"));
    await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(dir, ".claude", "loop.json"),
      JSON.stringify({ productName: "runner", memory: { enabled: "on" } })
    );
    const cfg = await readMemoryConfig(dir);
    expect(cfg.project).toBe("runner");
  });

  test("explicit memory.project overrides productName", async () => {
    const dir = await fs.mkdtemp(path.join(tmpDir, "repo-"));
    await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(dir, ".claude", "loop.json"),
      JSON.stringify({ productName: "runner", memory: { enabled: "on", project: "explicit" } })
    );
    const cfg = await readMemoryConfig(dir);
    expect(cfg.project).toBe("explicit");
  });

  const modeCases: Array<[unknown, "off" | "on" | "auto"]> = [
    [false, "off"],
    ["off", "off"],
    ["never", "off"],
    ["false", "off"],
    [true, "on"],
    ["on", "on"],
    ["always", "on"],
    ["auto", "auto"],
    ["something-else", "off"]
  ];
  for (const [enabled, expected] of modeCases) {
    test(`memory.enabled=${JSON.stringify(enabled)} normalizes to ${expected}`, async () => {
      repoDir = await writeRepo({ enabled, project: "loop" });
      const cfg = await readMemoryConfig(repoDir);
      expect(cfg.mode).toBe(expected);
      expect(cfg.project).toBe("loop");
    });
  }
});

describe("recordMemory gating", () => {
  test("AC-1: disabled -> no-op, CLI never resolved/spawned", async () => {
    repoDir = await writeRepo({ enabled: "off" });
    // Point the env at a valid capturing CLI to prove it is NOT used when off.
    await installCapturingCli();
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = cliRoot;

    const res = await recordMemory(repoDir, { kind: "decision", content: "DEC-999: x" });
    expect(res).toEqual({ recorded: false, reason: "disabled" });
    expect(await readCaptured()).toHaveLength(0);
  });

  test("AC-2: enabled but no CLI -> no-op, no throw", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    // Env points at an empty root (no bin/astramem); with no astramem on PATH
    // in CI this resolves to null. On a dev box with astramem on PATH this may
    // resolve — so assert only the contract: never throws, boolean recorded.
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = path.join(tmpDir, "empty");
    const res = await recordMemory(repoDir, { kind: "note", content: "hi" });
    expect(typeof res.recorded).toBe("boolean");
  });

  test("empty content -> no-op regardless of enablement", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    await installCapturingCli();
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = cliRoot;
    const res = await recordMemory(repoDir, { kind: "note", content: "   " });
    expect(res).toEqual({ recorded: false, reason: "empty" });
    expect(await readCaptured()).toHaveLength(0);
  });
});

describe("recordMemory spawn (capturing fake CLI)", () => {
  test("AC-3: enabled + CLI resolves -> spawns `remember --content .. --type ..`", async () => {
    repoDir = await writeRepo({ enabled: "on", project: "loop" });
    await installCapturingCli();
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = cliRoot;

    const res = await recordDecision(repoDir, {
      id: "DEC-064",
      title: "tier hardening",
      featureId: "FEAT-216",
      sliceId: "SLICE-140"
    });
    expect(res.recorded).toBe(true);

    if (isWin) return; // argv capture is POSIX-only
    await new Promise<void>((r) => setTimeout(r, 250));
    const calls = await readCaptured();
    expect(calls).toHaveLength(1);
    const argv = calls[0];
    expect(argv[0]).toBe("remember");
    expect(argv).toContain("--content");
    expect(argv).toContain("--type");
    expect(argv[argv.indexOf("--type") + 1]).toBe("decision");
    expect(argv).toContain("--project");
    expect(argv[argv.indexOf("--project") + 1]).toBe("loop");
    const content = argv[argv.indexOf("--content") + 1];
    expect(content).toContain("DEC-064");
    expect(content).toContain("tier hardening");
    // FEAT/SLICE traceability embedded in content.
    expect(content).toContain("[FEAT-216/SLICE-140]");
  });

  test("AC-4: content is sanitized (control chars stripped, no forged newline)", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    await installCapturingCli();
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = cliRoot;

    await recordNote(repoDir, { text: "line1\nline2\tFORGEDend" });
    if (isWin) return;
    await new Promise<void>((r) => setTimeout(r, 250));
    const calls = await readCaptured();
    expect(calls).toHaveLength(1);
    const content = calls[0][calls[0].indexOf("--content") + 1];
    expect(content).not.toContain("\n"); // newline stripped -> space
    expect(content).not.toContain("\t"); // tab stripped -> space (control char)
    expect(content).toContain("FORGED"); // preserved, just inlined
  });

  test("recordLesson uses type=lesson and prefixes the sliceId", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    await installCapturingCli();
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = cliRoot;

    await recordLesson(repoDir, { lesson: "prefer resolver over env", sliceId: "SLICE-1" });
    if (isWin) return;
    await new Promise<void>((r) => setTimeout(r, 250));
    const calls = await readCaptured();
    expect(calls).toHaveLength(1);
    const argv = calls[0];
    expect(argv[argv.indexOf("--type") + 1]).toBe("lesson");
    expect(argv[argv.indexOf("--content") + 1]).toContain("[SLICE-1]");
  });

  test("project argv is sanitized (control chars stripped)", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    await installCapturingCli();
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = cliRoot;

    await recordMemory(repoDir, {
      kind: "note",
      content: "x",
      project: "proj\n--type\nevil"
    });
    if (isWin) return;
    await new Promise<void>((r) => setTimeout(r, 250));
    const calls = await readCaptured();
    expect(calls).toHaveLength(1);
    const argv = calls[0];
    const project = argv[argv.indexOf("--project") + 1];
    expect(project).not.toContain("\n");
    // The injected control chars are gone; the payload is a single flat token.
    expect(project).toBe("proj--typeevil");
  });

  test("no --project flag when project is unconfigured", async () => {
    repoDir = await writeRepo({ enabled: "on" }); // no project
    await installCapturingCli();
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = cliRoot;

    await recordNote(repoDir, { text: "note without project" });
    if (isWin) return;
    await new Promise<void>((r) => setTimeout(r, 250));
    const calls = await readCaptured();
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain("--project");
  });
});

describe("recordMemory fail-silent + cap", () => {
  test("AC-5: resolves within ~2.5s even when the CLI hangs", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    const binDir = path.join(cliRoot, "bin");
    await fs.mkdir(binDir, { recursive: true });
    if (isWin) {
      await fs.writeFile(
        path.join(binDir, "astramem.cmd"),
        '@echo off\npowershell -Command "Start-Sleep 30"\n'
      );
    } else {
      const cli = path.join(binDir, "astramem");
      await fs.writeFile(cli, "#!/bin/sh\nsleep 30\n");
      await fs.chmod(cli, 0o755);
    }
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = cliRoot;

    const start = Date.now();
    const res = await recordNote(repoDir, { text: "should not block" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2500);
    expect(res.recorded).toBe(true);
  });
});
