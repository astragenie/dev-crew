// Tests for src/scripts/lib/memory-sink.mts (FEAT-217; CLI-spawn fallback
// retired FEAT-235). A fake WireProvider is injected via
// @astragenie/astramem-client's _setWireProvider test seam so no real
// astramem process is ever spawned. Every path must be fail-silent.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import {
  readMemoryConfig,
  recordDecision,
  recordFailure,
  recordLesson,
  recordMemory,
  recordNote
} from "../scripts/lib/memory-sink.mjs";

let tmpDir: string;
let repoDir: string;

/** A single captured provider.remember() call. */
interface CapturedCall {
  id: string;
  type: string;
  text: string;
  project?: string;
  agent?: string;
  metadata?: Record<string, unknown>;
}

/** Write a repo dir with .claude/loop.json holding the given memory block. */
async function writeRepo(memory: unknown): Promise<string> {
  const dir = await fs.mkdtemp(path.join(tmpDir, "repo-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  const loopJson = memory === undefined ? {} : { memory };
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify(loopJson));
  return dir;
}

/** Inject a capturing fake provider; returns the array calls are pushed to. */
function installCapturingProvider(): CapturedCall[] {
  const calls: CapturedCall[] = [];
  _setWireProvider({
    remember: async (req) => {
      calls.push(req as CapturedCall);
    },
    recall: async () => ({ hits: [] }),
    health: async () => ({ ok: true })
  });
  return calls;
}

beforeEach(async () => {
  _setWireProvider(null);
  _resetResolveCache();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "memsink-"));
});

afterEach(async () => {
  _setWireProvider(null);
  _resetResolveCache();
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

  test("FEAT-233/DEC-071: memory.capMs is parsed through as-is", async () => {
    repoDir = await writeRepo({ enabled: "on", capMs: 500 });
    const cfg = await readMemoryConfig(repoDir);
    expect(cfg.capMs).toBe(500);
  });

  test("FEAT-233/DEC-071: non-positive or non-numeric memory.capMs is dropped (falls back later)", async () => {
    repoDir = await writeRepo({ enabled: "on", capMs: -1 });
    expect((await readMemoryConfig(repoDir)).capMs).toBeUndefined();

    repoDir = await writeRepo({ enabled: "on", capMs: "2000" });
    expect((await readMemoryConfig(repoDir)).capMs).toBeUndefined();

    repoDir = await writeRepo({ enabled: "on" });
    expect((await readMemoryConfig(repoDir)).capMs).toBeUndefined();
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
  test("AC-1: disabled -> no-op, provider never resolved/called", async () => {
    repoDir = await writeRepo({ enabled: "off" });
    // Inject a valid capturing provider to prove it is NOT used when off.
    const calls = installCapturingProvider();

    const res = await recordMemory(repoDir, { kind: "decision", content: "DEC-999: x" });
    expect(res).toEqual({ recorded: false, reason: "disabled" });
    expect(calls).toHaveLength(0);
  });

  test("AC-2: enabled but no provider -> no-op, no throw", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    _setWireProvider(null);
    const res = await recordMemory(repoDir, { kind: "note", content: "hi" });
    expect(res).toEqual({ recorded: false, reason: "no-cli" });
  });

  test("empty content -> no-op regardless of enablement", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    const calls = installCapturingProvider();
    const res = await recordMemory(repoDir, { kind: "note", content: "   " });
    expect(res).toEqual({ recorded: false, reason: "empty" });
    expect(calls).toHaveLength(0);
  });
});

describe("recordMemory delivery (capturing fake provider)", () => {
  test("AC-3: enabled + provider resolves -> delivers type/content/project", async () => {
    repoDir = await writeRepo({ enabled: "on", project: "loop" });
    const calls = installCapturingProvider();

    const res = await recordDecision(repoDir, {
      id: "DEC-064",
      title: "tier hardening",
      featureId: "FEAT-216",
      sliceId: "SLICE-140"
    });
    expect(res.recorded).toBe(true);

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.type).toBe("decision");
    expect(call.metadata?.["project"]).toBe("loop");
    expect(call.text).toContain("DEC-064");
    expect(call.text).toContain("tier hardening");
    // FEAT/SLICE traceability embedded in content.
    expect(call.text).toContain("[FEAT-216/SLICE-140]");
  });

  test("agentType is passed in metadata.agent (FEAT-219 / #309)", async () => {
    repoDir = await writeRepo({ enabled: "on", project: "loop" });
    const calls = installCapturingProvider();

    await recordDecision(repoDir, {
      id: "DEC-070",
      title: "x",
      agentType: "crew:reviewer"
    });
    expect(calls[0]?.metadata?.["agent"]).toBe("crew:reviewer");
  });

  test("no agent metadata key when agentType is absent", async () => {
    repoDir = await writeRepo({ enabled: "on", project: "loop" });
    const calls = installCapturingProvider();

    await recordNote(repoDir, { text: "untagged note" });
    expect(calls[0]?.metadata?.["agent"]).toBeUndefined();
  });

  test("recordFailure uses type=failure and carries agent (AC-3)", async () => {
    repoDir = await writeRepo({ enabled: "on", project: "loop" });
    const calls = installCapturingProvider();

    const res = await recordFailure(repoDir, {
      summary: "review rejected: missing null check",
      sliceId: "SLICE-01",
      agentType: "crew:reviewer"
    });
    expect(res.recorded).toBe(true);
    expect(calls[0]?.type).toBe("failure");
    expect(calls[0]?.metadata?.["agent"]).toBe("crew:reviewer");
  });

  test("AC-4: content is sanitized (control chars stripped, no forged newline)", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    const calls = installCapturingProvider();

    await recordNote(repoDir, { text: "line1\nline2\tFORGEDend" });
    expect(calls).toHaveLength(1);
    const content = calls[0]!.text;
    expect(content).not.toContain("\n"); // newline stripped -> space
    expect(content).not.toContain("\t"); // tab stripped -> space (control char)
    expect(content).toContain("FORGED"); // preserved, just inlined
  });

  test("recordLesson uses type=lesson and prefixes the sliceId", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    const calls = installCapturingProvider();

    await recordLesson(repoDir, { lesson: "prefer resolver over env", sliceId: "SLICE-1" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.type).toBe("lesson");
    expect(calls[0]!.text).toContain("[SLICE-1]");
  });

  test("project metadata is sanitized (control chars stripped)", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    const calls = installCapturingProvider();

    await recordMemory(repoDir, {
      kind: "note",
      content: "x",
      project: "proj\n--type\nevil"
    });
    expect(calls).toHaveLength(1);
    const project = calls[0]!.metadata?.["project"] as string;
    expect(project).not.toContain("\n");
    // The injected control chars are gone; the payload is a single flat token.
    expect(project).toBe("proj--typeevil");
  });

  test("no project metadata key when project is unconfigured", async () => {
    repoDir = await writeRepo({ enabled: "on" }); // no project
    const calls = installCapturingProvider();

    await recordNote(repoDir, { text: "note without project" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.metadata?.["project"]).toBeUndefined();
  });

  test("CANARY-REVIEWER-8801: project/agent are also delivered as top-level payload fields", async () => {
    repoDir = await writeRepo({ enabled: "on", project: "loop" });
    const calls = installCapturingProvider();

    await recordDecision(repoDir, {
      id: "DEC-080",
      title: "top-level tagging",
      agentType: "crew:reviewer"
    });

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    // Top level: what a provider reading flat request fields (not metadata) sees.
    expect(call.project).toBe("loop");
    expect(call.agent).toBe("crew:reviewer");
    // metadata copy stays intact — back-compat with providers that only read metadata.
    expect(call.metadata?.["project"]).toBe("loop");
    expect(call.metadata?.["agent"]).toBe("crew:reviewer");
  });

  test("no top-level project/agent keys when both are absent", async () => {
    repoDir = await writeRepo({ enabled: "on" }); // no project configured
    const calls = installCapturingProvider();

    await recordNote(repoDir, { text: "untagged note" });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.project).toBeUndefined();
    expect(calls[0]?.agent).toBeUndefined();
  });
});

describe("recordMemory fail-silent + cap", () => {
  test("AC-5: resolves within ~2.5s even when the provider hangs", async () => {
    repoDir = await writeRepo({ enabled: "on" });
    _setWireProvider({
      remember: () => new Promise(() => {}), // never settles
      recall: async () => ({ hits: [] }),
      health: async () => ({ ok: true })
    });

    const start = Date.now();
    const res = await recordNote(repoDir, { text: "should not block" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2500);
    expect(res.recorded).toBe(false); // hung provider never resolves -> no-cli
  });

  test("FEAT-233/DEC-071: memory.capMs shortens the envelope below DEFAULT_MEMORY_CAP_MS (2000ms)", async () => {
    repoDir = await writeRepo({ enabled: "on", capMs: 300 });
    _setWireProvider({
      remember: () => new Promise(() => {}), // never settles
      recall: async () => ({ hits: [] }),
      health: async () => ({ ok: true })
    });

    const start = Date.now();
    await recordNote(repoDir, { text: "should not block" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1500);
  });
});
