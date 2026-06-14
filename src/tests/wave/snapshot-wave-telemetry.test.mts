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
});
