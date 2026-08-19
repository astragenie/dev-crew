import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { updateIndex } from "../../scripts/lib/wave/artifacts.mjs";
import type { WavePlan, WaveResult } from "../../scripts/lib/wave/types.mjs";

// SLICE-182 (FEAT-276 AC-5): updateIndex must surface requested waveSize
// alongside the achieved plan.size, and the per-category rejection
// breakdown (conflict vs missing-confidence vs other), on every index.json
// entry it writes — not just the pass/fail summary that already existed.

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-artifacts-rejection-"));
  mkdirSync(join(tmp, ".claude/artifacts/loop/waves"), { recursive: true });
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function makeResult(plan: WavePlan): WaveResult {
  return {
    waveId: plan.waveId,
    plan,
    worktreeResults: [],
    mergedBranches: plan.items.map((i) => i.worktreeBranch),
    failedBranches: [],
    postMergeTest: { ran: true, status: "PASS" },
    failurePivots: [],
    durationMs: 500
  };
}

describe("updateIndex — rejection telemetry (AC-5)", () => {
  test("records requested waveSize distinct from achieved size", () => {
    const plan: WavePlan = {
      waveId: "wave-solo-in-wide-request",
      size: 1,
      items: [
        {
          sliceId: "SLICE-1",
          featureId: "FEAT-1",
          worktreeBranch: "wave/wave-solo-in-wide-request/SLICE-1",
          sliceCommand: "/devcrew:orchestrate-slice"
        }
      ],
      rejected: [],
      config: { waveSize: 4, sliceCommand: "/devcrew:orchestrate-slice" }
    };
    updateIndex(tmp, makeResult(plan), ".claude/artifacts/loop/waves");
    const idx = JSON.parse(
      readFileSync(join(tmp, ".claude/artifacts/loop/waves/index.json"), "utf8")
    );
    expect(idx.entries[0].size).toBe(1);
    expect(idx.entries[0].waveSize).toBe(4);
  });

  test("categorizes mixed rejections into conflict / missing-confidence / other counts", () => {
    const plan: WavePlan = {
      waveId: "wave-mixed-rejections",
      size: 1,
      items: [
        {
          sliceId: "SLICE-1",
          featureId: "FEAT-1",
          worktreeBranch: "wave/wave-mixed-rejections/SLICE-1",
          sliceCommand: "/devcrew:orchestrate-slice"
        }
      ],
      rejected: [
        { sliceId: "SLICE-2", reason: "conflict_with_src/shared.mts" },
        { sliceId: "SLICE-3", reason: "missing_touches_files_solo_only" },
        { sliceId: "SLICE-4", reason: "missing_touches_files_solo_only" },
        { sliceId: "SLICE-5", reason: "pre-flight: help_request open" }
      ],
      config: { waveSize: 5, sliceCommand: "/devcrew:orchestrate-slice" }
    };
    updateIndex(tmp, makeResult(plan), ".claude/artifacts/loop/waves");
    const idx = JSON.parse(
      readFileSync(join(tmp, ".claude/artifacts/loop/waves/index.json"), "utf8")
    );
    const entry = idx.entries[0];
    expect(entry.rejectedConflict).toBe(1);
    expect(entry.rejectedMissingConfidence).toBe(2);
    expect(entry.rejectedOther).toBe(1);
  });

  test("a clean wave with zero rejections records real zeros, not omitted fields", () => {
    const plan: WavePlan = {
      waveId: "wave-clean",
      size: 2,
      items: [],
      rejected: [],
      config: { waveSize: 2, sliceCommand: "/devcrew:orchestrate-slice" }
    };
    updateIndex(tmp, makeResult(plan), ".claude/artifacts/loop/waves");
    const idx = JSON.parse(
      readFileSync(join(tmp, ".claude/artifacts/loop/waves/index.json"), "utf8")
    );
    const entry = idx.entries[0];
    expect(entry.rejectedConflict).toBe(0);
    expect(entry.rejectedMissingConfidence).toBe(0);
    expect(entry.rejectedOther).toBe(0);
  });
});
