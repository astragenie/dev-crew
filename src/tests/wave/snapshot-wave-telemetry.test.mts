import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { renderWaveTelemetry } from "../../scripts/lib/memory-snapshot.mjs";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-telemetry-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("renderWaveTelemetry", () => {
  test("returns empty string when index.json missing", () => {
    expect(renderWaveTelemetry(tmp)).toBe("");
  });

  test("returns empty string when index has zero entries", () => {
    mkdirSync(join(tmp, ".claude/artifacts/loop/waves"), { recursive: true });
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/waves/index.json"),
      JSON.stringify({ entries: [] }),
      "utf8"
    );
    expect(renderWaveTelemetry(tmp)).toBe("");
  });

  test("emits block summarizing entries with last wave + avg PASS rate", () => {
    mkdirSync(join(tmp, ".claude/artifacts/loop/waves"), { recursive: true });
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/waves/index.json"),
      JSON.stringify({
        entries: [
          {
            waveId: "w1",
            size: 3,
            passCount: 2,
            failCount: 1,
            postMergeTest: "PASS",
            durationMs: 100
          },
          {
            waveId: "w2",
            size: 3,
            passCount: 3,
            failCount: 0,
            postMergeTest: "PASS",
            durationMs: 200
          }
        ]
      }),
      "utf8"
    );
    const text = renderWaveTelemetry(tmp);
    expect(text).toContain("## Wave telemetry");
    expect(text).toContain("Last wave: w2");
    expect(text).toContain("size=3");
    expect(text).toContain("PASS=3");
    expect(text).toContain("avg PASS rate 0.83");
  });

  // SLICE-182 (FEAT-276 AC-5): packing width + per-rejection-reason coverage.
  test("renders packed X/Y and shows both achieved width and requested waveSize", () => {
    mkdirSync(join(tmp, ".claude/artifacts/loop/waves"), { recursive: true });
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/waves/index.json"),
      JSON.stringify({
        entries: [
          {
            waveId: "w1",
            size: 1,
            waveSize: 4,
            passCount: 1,
            failCount: 0,
            postMergeTest: "PASS",
            durationMs: 100,
            rejectedConflict: 0,
            rejectedMissingConfidence: 0,
            rejectedOther: 0
          }
        ]
      }),
      "utf8"
    );
    const text = renderWaveTelemetry(tmp);
    // "packed 1/4" must be distinguishable from "packed 1/1" — the whole
    // point of surfacing the requested waveSize alongside achieved size.
    expect(text).toContain("packed 1/4");
    expect(text).not.toContain("packed 1/1");
  });

  test("distinguishes a solo-only wave caused by a narrow request from one caused by rejections", () => {
    mkdirSync(join(tmp, ".claude/artifacts/loop/waves"), { recursive: true });
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/waves/index.json"),
      JSON.stringify({
        entries: [
          {
            waveId: "w1",
            size: 1,
            waveSize: 1,
            passCount: 1,
            failCount: 0,
            postMergeTest: "PASS",
            durationMs: 100,
            rejectedConflict: 0,
            rejectedMissingConfidence: 0,
            rejectedOther: 0
          }
        ]
      }),
      "utf8"
    );
    expect(renderWaveTelemetry(tmp)).toContain("packed 1/1");
  });

  test("aggregates rejection reasons by category — conflict vs missing-confidence — not raw strings", () => {
    mkdirSync(join(tmp, ".claude/artifacts/loop/waves"), { recursive: true });
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/waves/index.json"),
      JSON.stringify({
        entries: [
          {
            waveId: "w1",
            size: 1,
            waveSize: 4,
            passCount: 1,
            failCount: 0,
            postMergeTest: "PASS",
            durationMs: 100,
            rejectedConflict: 2,
            rejectedMissingConfidence: 1,
            rejectedOther: 0
          }
        ]
      }),
      "utf8"
    );
    const text = renderWaveTelemetry(tmp);
    expect(text).toContain("Last wave rejections: 3 (conflict=2, missing-confidence=1)");
    // Raw reason strings (e.g. "conflict_with_src/foo.mts") must never leak
    // into the aggregate line.
    expect(text).not.toContain("conflict_with_");
  });

  test("falls back to size=N and omits the rejections line for entries written before this field existed", () => {
    mkdirSync(join(tmp, ".claude/artifacts/loop/waves"), { recursive: true });
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/waves/index.json"),
      JSON.stringify({
        entries: [
          {
            waveId: "old-1",
            size: 1,
            passCount: 1,
            failCount: 0,
            postMergeTest: "PASS",
            durationMs: 42
          }
        ]
      }),
      "utf8"
    );
    const text = renderWaveTelemetry(tmp);
    expect(text).toContain("size=1");
    expect(text).not.toContain("packed");
    expect(text).not.toContain("Last wave rejections");
  });
});
