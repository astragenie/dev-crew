import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emitAgentNarrative } from "../scripts/lib/agent-narrative-emitter.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

const FIXTURE = path.resolve(import.meta.dirname, "fixtures", "crew-bundle-sample.md");

async function tempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-narrative-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(dir, ".claude", "loop.json"),
    JSON.stringify({
      loop: {
        notifications: {
          mode: "webhook",
          webhook: {
            url: "https://runner.local/h",
            tenantId: "T",
            appId: "A",
            bearer: "B"
          }
        }
      }
    })
  );
  return dir;
}

interface Captured {
  kind: string;
  payload: Record<string, unknown>;
}

async function captureFanouts<T>(
  fn: () => Promise<T>
): Promise<{ result: T; captured: Captured[] }> {
  const captured: Captured[] = [];
  const originalFetch = fanoutInternals.fetch;
  fanoutInternals.fetch = (async (_url, init) => {
    try {
      const body = JSON.parse(String(init?.body));
      captured.push({ kind: body.kind, payload: body.payload });
    } catch {
      // ignore
    }
    return new Response(null, { status: 202 });
  }) as typeof fanoutInternals.fetch;
  try {
    const result = await fn();
    return { result, captured };
  } finally {
    fanoutInternals.fetch = originalFetch;
  }
}

describe("emitAgentNarrative", () => {
  test("fans out one envelope per stage marker + per tool call", async () => {
    const repo = await tempRepo();
    const { result, captured } = await captureFanouts(() =>
      emitAgentNarrative(repo, "SLICE-1", FIXTURE)
    );
    expect(result.progressCount).toBe(3);
    expect(result.toolCount).toBe(5);

    const progress = captured.filter((c) => c.kind === "slice.agent_progress");
    expect(progress.length).toBe(3);
    expect(progress[0].payload.stage).toBe("discover");
    expect(progress[0].payload.sliceId).toBe("SLICE-1");
    expect(progress[0].payload.agent).toBe("crew:builder");

    const tools = captured.filter((c) => c.kind === "agent.tool_call");
    expect(tools.length).toBe(5);
    expect(tools[0].payload.toolName).toBe("Read");
    expect(tools[0].payload.durationMs).toBe(42);
    expect(tools[4].payload.toolName).toBe("Bash");
  });

  test("returns zero counts when bundle is unreadable", async () => {
    const repo = await tempRepo();
    const { result, captured } = await captureFanouts(() =>
      emitAgentNarrative(repo, "SLICE-1", path.join(repo, "does-not-exist.md"))
    );
    expect(result.progressCount).toBe(0);
    expect(result.toolCount).toBe(0);
    expect(captured.length).toBe(0);
  });

  test("uses fallbackTs when bundle has no ts on marker", async () => {
    const repo = await tempRepo();
    const fallback = "2026-06-15T00:00:00.000Z";
    const { captured } = await captureFanouts(() =>
      emitAgentNarrative(repo, "SLICE-1", FIXTURE, fallback)
    );
    const progress = captured.filter((c) => c.kind === "slice.agent_progress");
    expect(progress[0].payload.ts).toBe(fallback);
    const tools = captured.filter((c) => c.kind === "agent.tool_call");
    expect(tools[0].payload.ts).toBe(fallback);
  });
});
