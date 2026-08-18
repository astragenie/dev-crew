import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendGradeEvent, GRADE_JSONL_RELATIVE } from "../scripts/lib/grade-jsonl-writer.mjs";

async function withTempRepo(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "loop-grade-jsonl-"));
}

describe("appendGradeEvent", () => {
  test("writes one row with full grade-event shape", async () => {
    const repo = await withTempRepo();
    await appendGradeEvent(repo, {
      sliceId: "SLICE-1",
      featureId: "FEAT-9",
      spec: "SPEC-3",
      recordedAt: "2026-06-15T12:00:00.000Z",
      scores: { architecture_quality: 0.9, reliability: 0.85 },
      decisions: [{ id: "DEC-001", status: "accepted", body: "use X" }],
      timing: { wall_clock_seconds: 12 },
      shape: { classified: "small" }
    });

    const file = path.join(repo, GRADE_JSONL_RELATIVE);
    const content = await fs.readFile(file, "utf8");
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(1);
    const row = JSON.parse(lines[0]);
    expect(row.sliceId).toBe("SLICE-1");
    expect(row.scores.architecture_quality).toBe(0.9);
    expect(row.decisions[0].id).toBe("DEC-001");
    expect(row.recordedAt).toBe("2026-06-15T12:00:00.000Z");
  });

  test("appends a second row without overwriting the first", async () => {
    const repo = await withTempRepo();
    await appendGradeEvent(repo, {
      sliceId: "SLICE-1",
      recordedAt: "2026-06-15T12:00:00.000Z",
      scores: { reliability: 0.8 }
    });
    await appendGradeEvent(repo, {
      sliceId: "SLICE-2",
      recordedAt: "2026-06-15T13:00:00.000Z",
      scores: { reliability: 0.9 }
    });
    const file = path.join(repo, GRADE_JSONL_RELATIVE);
    const lines = (await fs.readFile(file, "utf8")).trim().split("\n");
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]).sliceId).toBe("SLICE-1");
    expect(JSON.parse(lines[1]).sliceId).toBe("SLICE-2");
  });
});
