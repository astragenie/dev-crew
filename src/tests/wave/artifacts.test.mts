import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, existsSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeWaveArtifacts, updateIndex } from "../../scripts/lib/wave/artifacts.mjs";
import type { WavePlan, WaveResult } from "../../scripts/lib/wave/types.mjs";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-artifacts-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

const plan: WavePlan = {
  waveId: "wave-1",
  size: 1,
  items: [
    {
      sliceId: "SLICE-1",
      featureId: "FEAT-1",
      worktreeBranch: "wave/wave-1/SLICE-1",
      sliceCommand: "/crew:orchestrate-slice"
    }
  ],
  rejected: [],
  config: { waveSize: 3, sliceCommand: "/crew:orchestrate-slice" }
};

const result: WaveResult = {
  waveId: "wave-1",
  plan,
  worktreeResults: [
    {
      sliceId: "SLICE-1",
      branch: "wave/wave-1/SLICE-1",
      worktreePath: "/tmp/wt/SLICE-1",
      status: "PASS",
      marker: { slice: "SLICE-1", status: "PASS" },
      artifacts: []
    }
  ],
  mergedBranches: ["wave/wave-1/SLICE-1"],
  failedBranches: [],
  postMergeTest: { ran: true, status: "PASS", logPath: "post-merge-test.log" },
  failurePivots: [],
  durationMs: 1234
};

describe("writeWaveArtifacts", () => {
  test("writes plan.json + wave-result.json + per-slice marker", () => {
    writeWaveArtifacts(tmp, result, ".claude/artifacts/loop/waves");
    const base = join(tmp, ".claude/artifacts/loop/waves/wave-1");
    expect(existsSync(join(base, "plan.json"))).toBe(true);
    expect(existsSync(join(base, "wave-result.json"))).toBe(true);
    expect(existsSync(join(base, "SLICE-1-marker.json"))).toBe(true);
  });

  test("plan.json round-trips", () => {
    writeWaveArtifacts(tmp, result, ".claude/artifacts/loop/waves");
    const raw = readFileSync(join(tmp, ".claude/artifacts/loop/waves/wave-1/plan.json"), "utf8");
    expect(JSON.parse(raw).waveId).toBe("wave-1");
  });
});

describe("updateIndex", () => {
  test("appends new wave summary, capped at 50", () => {
    mkdirSync(join(tmp, ".claude/artifacts/loop/waves"), { recursive: true });
    for (let i = 0; i < 60; i++) {
      updateIndex(tmp, { ...result, waveId: `w-${i}` }, ".claude/artifacts/loop/waves");
    }
    const raw = readFileSync(join(tmp, ".claude/artifacts/loop/waves/index.json"), "utf8");
    const idx = JSON.parse(raw);
    expect(idx.entries).toHaveLength(50);
    expect(idx.entries[0].waveId).toBe("w-10");
    expect(idx.entries[49].waveId).toBe("w-59");
  });
});
