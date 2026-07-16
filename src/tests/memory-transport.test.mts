// memory-transport.mts — in-process MemoryProvider transport (FEAT-188 S1b, #357).
//
// Covers the three S1b transport ACs:
//   (a) provider path: payload reaches provider.remember() with the correct
//       IngestPayload shape, and callers report success;
//   (b) degrade: plugin absent / provider failing → silent false, callers
//       fall back (CLI or no-op) without throwing;
//   (c) cap: a hung provider cannot block the caller past the wallclock cap.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  type ProviderIngestPayload,
  _resetTransportCache,
  _setProvider,
  sendViaProvider
} from "../scripts/lib/memory-transport.mjs";
import { recordMemory } from "../scripts/lib/memory-sink.mjs";

let tmpRepo: string;

beforeEach(async () => {
  _resetTransportCache();
  tmpRepo = await fs.mkdtemp(path.join(os.tmpdir(), "mem-transport-"));
  await fs.mkdir(path.join(tmpRepo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(tmpRepo, ".claude", "loop.json"),
    JSON.stringify({ memory: { enabled: "on", project: "test-proj" } })
  );
});

afterEach(async () => {
  _resetTransportCache();
  await fs.rm(tmpRepo, { recursive: true, force: true });
});

describe("sendViaProvider — runtime discovery (no injection)", () => {
  let fakeRoot: string;
  let priorEnvRoot: string | undefined;

  beforeEach(async () => {
    priorEnvRoot = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    fakeRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mem-fake-plugin-"));
    const libDir = path.join(fakeRoot, "src", "lib");
    await fs.mkdir(libDir, { recursive: true });
    await fs.writeFile(
      path.join(libDir, "selector.ts"),
      `export async function resolveProvider() {
  return {
    provider: {
      remember: async (req) => {
        globalThis.__memTransportSeen = req;
      }
    }
  };
}
`
    );
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = fakeRoot;
  });

  afterEach(async () => {
    if (priorEnvRoot === undefined) delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    else process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = priorEnvRoot;
    (globalThis as Record<string, unknown>)["__memTransportSeen"] = undefined;
    await fs.rm(fakeRoot, { recursive: true, force: true });
  });

  test("discovers the env-pinned plugin root and delivers via its selector", async () => {
    // No _setProvider call — exercises candidateRoots() + resolveFromRoot()
    // (env root branch) + the pathToFileURL dynamic import on this platform.
    // Explicit capMs: unlike every other test in this file, this path does a
    // real disk-based dynamic import (module resolution + compile), not an
    // injected in-memory provider. The production default (2000ms, tuned for
    // the fast injected hot path) races that real import against
    // `bun test --parallel`'s worker-process CPU/disk contention and loses
    // intermittently (FEAT-260) — reproduced as a fail in 2/2 full-suite runs
    // under the default cap on a 20-core worker count; 0 failures across 3
    // full-suite runs once given this generous budget.
    const ok = await sendViaProvider({ id: "d1", type: "lesson", text: "via discovery" }, 20000);

    expect(ok).toBe(true);
    const seen = (globalThis as Record<string, unknown>)["__memTransportSeen"] as
      | ProviderIngestPayload
      | undefined;
    expect(seen?.type).toBe("lesson");
    expect(seen?.text).toBe("via discovery");
  });

  test("degrades false for a root without a selector module", async () => {
    await fs.rm(path.join(fakeRoot, "src", "lib", "selector.ts"));
    const ok = await sendViaProvider({ id: "d2", type: "note", text: "t" });
    expect(ok).toBe(false);
  });
});

describe("sendViaProvider — provider path", () => {
  test("delivers the payload to provider.remember and resolves true", async () => {
    const seen: ProviderIngestPayload[] = [];
    _setProvider({
      remember: async (req) => {
        seen.push(req);
      }
    });

    const ok = await sendViaProvider({ id: "id-1", type: "lesson", text: "hello" });

    expect(ok).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.type).toBe("lesson");
    expect(seen[0]?.text).toBe("hello");
  });

  test("resolves false when provider.remember rejects (fail-silent)", async () => {
    _setProvider({
      remember: async () => {
        throw new Error("daemon down");
      }
    });

    await expect(sendViaProvider({ id: "x", type: "note", text: "t" })).resolves.toBe(false);
  });

  test("resolves false when no plugin is discoverable (degrade)", async () => {
    // No injected provider; env root unset/fake; PATH probe disabled by
    // bunfig preload (ASTRAMEM_DISABLE_PATH_PROBE) → resolveCli null.
    _setProvider(null);
    await expect(sendViaProvider({ id: "x", type: "note", text: "t" })).resolves.toBe(false);
  });

  test("caps a hung provider instead of blocking the caller", async () => {
    _setProvider({
      remember: () => new Promise(() => {}) // never settles
    });

    const started = Date.now();
    const ok = await sendViaProvider({ id: "x", type: "note", text: "t" });
    const elapsed = Date.now() - started;

    expect(ok).toBe(false);
    expect(elapsed).toBeLessThan(4000); // CAP_MS=2000 + slack
  });
});

describe("recordMemory — provider-first transport", () => {
  test("records via injected provider with kind/text + project/agent metadata", async () => {
    const seen: ProviderIngestPayload[] = [];
    _setProvider({
      remember: async (req) => {
        seen.push(req);
      }
    });

    const result = await recordMemory(tmpRepo, {
      kind: "lesson",
      content: "worktree cwd bites again",
      agentType: "crew:builder"
    });

    expect(result).toEqual({ recorded: true, reason: "ok" });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.type).toBe("lesson");
    expect(seen[0]?.text).toBe("worktree cwd bites again");
    expect(seen[0]?.metadata).toEqual({ project: "test-proj", agent: "crew:builder" });
    // CANARY-REVIEWER-8801: same tags also delivered as top-level fields.
    expect(seen[0]?.project).toBe("test-proj");
    expect(seen[0]?.agent).toBe("crew:builder");
    expect(typeof seen[0]?.id).toBe("string");
    expect(seen[0]?.id.length).toBeGreaterThan(0);
  });

  test("degrades to no-cli (not throw) when provider absent and CLI unresolvable", async () => {
    _setProvider(null);
    const result = await recordMemory(tmpRepo, { kind: "note", content: "n" });
    expect(result).toEqual({ recorded: false, reason: "no-cli" });
  });

  test("stays disabled without touching transport when memory is off", async () => {
    let called = 0;
    _setProvider({
      remember: async () => {
        called++;
      }
    });
    await fs.writeFile(
      path.join(tmpRepo, ".claude", "loop.json"),
      JSON.stringify({ memory: { enabled: "off" } })
    );

    const result = await recordMemory(tmpRepo, { kind: "note", content: "n" });

    expect(result).toEqual({ recorded: false, reason: "disabled" });
    expect(called).toBe(0);
  });
});

// GEPA event capture (emit/emitGepaEvent) coverage moved to
// memory-gepa.test.mts (FEAT-235) — memory-bridge.mts's emit() was retired
// and replaced by memory-gepa.mts::emitGepaEvent, which maps GepaPayload.event
// onto the closed MemoryKind enum (DEC-072) instead of sending the raw event
// string.
