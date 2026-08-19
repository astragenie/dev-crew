import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  detectAndEmitSpecialistPause,
  emitSpecialistPause
} from "../scripts/lib/specialist-pause-detector.mjs";
import { eventsPath } from "../scripts/lib/slice-events.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-specialist-pause-"));
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

describe("specialist-pause-detector", () => {
  test("emitSpecialistPause writes JSONL row AND fans out as slice.specialist_pause", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await emitSpecialistPause(
        repo,
        "SLICE-42",
        "devcrew:fullstack-dev",
        "Output ended mid-sentence",
        {
          featureId: "FEAT-99",
          expectedArtifactPath: ".claude/artifacts/crew/handoffs/SLICE-42.md",
          timestamp: "2026-06-15T12:00:00.000Z"
        }
      );
    } finally {
      fanoutInternals.fetch = originalFetch;
    }

    // Fanout: exactly one envelope with the right kind + payload
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("slice.specialist_pause");
    expect(body.payload.sliceId).toBe("SLICE-42");
    expect(body.payload.featureId).toBe("FEAT-99");
    expect(body.payload.agent).toBe("devcrew:fullstack-dev");
    expect(body.payload.reason).toBe("Output ended mid-sentence");
    expect(body.payload.expectedArtifactPath).toBe(".claude/artifacts/crew/handoffs/SLICE-42.md");

    // JSONL row mirrors what was emitted
    const raw = await fs.readFile(eventsPath(repo, "SLICE-42"), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.type).toBe("specialist_pause");
    expect(parsed.agent).toBe("devcrew:fullstack-dev");
    expect(parsed.reason).toBe("Output ended mid-sentence");
    expect(parsed.sliceId).toBe("SLICE-42");
  });

  test("detectAndEmitSpecialistPause: emits when output paused AND artifact missing", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    let emitted = false;
    try {
      emitted = await detectAndEmitSpecialistPause({
        repoPath: repo,
        sliceId: "SLICE-7",
        featureId: "FEAT-7",
        agent: "devcrew:reviewer",
        builderOutput: "Let me check the file... pausing now to think.",
        expectedArtifactPath: ".claude/artifacts/crew/reviews/missing.md",
        timestamp: "2026-06-15T13:00:00.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(emitted).toBe(true);
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("slice.specialist_pause");
    expect(body.payload.agent).toBe("devcrew:reviewer");
    expect(body.payload.sliceId).toBe("SLICE-7");
    expect(String(body.payload.reason)).toContain("pause keywords");
  });

  test("detectAndEmitSpecialistPause: no emit when output is clean AND artifact present", async () => {
    const repo = await withTempRepo();
    const artifactDir = path.join(repo, ".claude", "artifacts", "crew", "handoffs");
    await fs.mkdir(artifactDir, { recursive: true });
    const artifact = path.join(artifactDir, "ok.md");
    await fs.writeFile(artifact, "a".repeat(200));

    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    let emitted = true;
    try {
      emitted = await detectAndEmitSpecialistPause({
        repoPath: repo,
        sliceId: "SLICE-8",
        featureId: null,
        agent: "devcrew:verifier",
        builderOutput: "PASS — all gates green.",
        expectedArtifactPath: artifact
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(emitted).toBe(false);
    expect(calls.length).toBe(0);
  });
});
