import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  emitPhaseGateModeDetected,
  resolveCurrentSliceId
} from "../scripts/lib/phase-gate-mode-emitter.mjs";
import { eventsPath } from "../scripts/lib/slice-events.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-phase-gate-mode-"));
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

async function writeWorkflowState(repo: string, sliceId: string | null): Promise<void> {
  const dir = path.join(repo, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  const state = sliceId
    ? { version: "1.0", currentRun: { sliceId } }
    : { version: "1.0", currentRun: {} };
  await fs.writeFile(path.join(dir, "workflow-state.json"), JSON.stringify(state));
}

describe("phase-gate-mode-emitter", () => {
  test("emitPhaseGateModeDetected writes JSONL row AND fans out as slice.phase_gate_mode_detected", async () => {
    const repo = await withTempRepo();
    await writeWorkflowState(repo, "SLICE-42");
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await emitPhaseGateModeDetected(repo, {
        sliceId: "SLICE-42",
        mode: "parallel",
        timestamp: "2026-06-15T12:00:00.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }

    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("slice.phase_gate_mode_detected");
    expect(body.payload.sliceId).toBe("SLICE-42");
    expect(body.payload.mode).toBe("parallel");

    const raw = await fs.readFile(eventsPath(repo, "SLICE-42"), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.type).toBe("phase_gate_mode_detected");
    expect(parsed.mode).toBe("parallel");
    expect(parsed.sliceId).toBe("SLICE-42");
  });

  test("emitPhaseGateModeDetected serial mode", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await emitPhaseGateModeDetected(repo, {
        sliceId: "SLICE-7",
        mode: "serial",
        timestamp: "2026-06-15T13:00:00.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.payload.mode).toBe("serial");
  });

  test("resolveCurrentSliceId reads from workflow-state currentRun.sliceId", async () => {
    const repo = await withTempRepo();
    await writeWorkflowState(repo, "SLICE-99");
    const result = await resolveCurrentSliceId(repo);
    expect(result).toBe("SLICE-99");
  });

  test("resolveCurrentSliceId returns null when no sliceId set", async () => {
    const repo = await withTempRepo();
    await writeWorkflowState(repo, null);
    const result = await resolveCurrentSliceId(repo);
    expect(result).toBe(null);
  });

  test("resolveCurrentSliceId returns null when state file missing", async () => {
    const repo = await withTempRepo();
    const result = await resolveCurrentSliceId(repo);
    expect(result).toBe(null);
  });

  test("emitPhaseGateModeDetected skips when sliceId is null", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await emitPhaseGateModeDetected(repo, {
        sliceId: null,
        mode: "parallel"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(0);
  });
});
