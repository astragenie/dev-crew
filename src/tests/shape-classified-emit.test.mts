import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emitShapeClassified } from "../scripts/lib/shape-event-emitter.mjs";
import { eventsPath } from "../scripts/lib/slice-events.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-shape-classified-"));
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

describe("shape-event-emitter", () => {
  test("emitShapeClassified writes JSONL row AND fans out as slice.shape_classified", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await emitShapeClassified(repo, "SLICE-42", {
        featureId: "FEAT-99",
        shape: "doc-update",
        rationale: "all changed files are docs/markdown",
        inlinePathUsed: true,
        timestamp: "2026-06-15T12:00:00.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }

    // Fanout: exactly one envelope with the right kind + payload
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("slice.shape_classified");
    expect(body.payload.sliceId).toBe("SLICE-42");
    expect(body.payload.featureId).toBe("FEAT-99");
    expect(body.payload.shape).toBe("doc-update");
    expect(body.payload.rationale).toBe("all changed files are docs/markdown");
    expect(body.payload.inlinePathUsed).toBe(true);

    // JSONL row mirrors what was emitted
    const raw = await fs.readFile(eventsPath(repo, "SLICE-42"), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.type).toBe("shape_classified");
    expect(parsed.shape).toBe("doc-update");
    expect(parsed.rationale).toBe("all changed files are docs/markdown");
    expect(parsed.inlinePathUsed).toBe(true);
    expect(parsed.sliceId).toBe("SLICE-42");
  });

  test("emitShapeClassified: null featureId is preserved in payload", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await emitShapeClassified(repo, "SLICE-7", {
        featureId: null,
        shape: "none",
        rationale: "mixed file types",
        inlinePathUsed: false,
        timestamp: "2026-06-15T13:00:00.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.payload.featureId).toBe(null);
    expect(body.payload.inlinePathUsed).toBe(false);
    expect(body.payload.shape).toBe("none");
  });
});
