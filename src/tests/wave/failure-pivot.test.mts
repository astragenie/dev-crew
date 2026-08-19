// src/tests/wave/failure-pivot.test.mts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildFailurePivot, persistPivotAt } from "../../scripts/lib/wave/failure-pivot.mjs";
import type { SliceCandidate, WaveConfig, WorktreeResult } from "../../scripts/lib/wave/types.mjs";

const cfg: WaveConfig = {
  size: 3,
  sliceCommand: "/devcrew:orchestrate-slice",
  sliceCommandFallback: "/devcrew:build",
  fixCommand: "/devcrew:fix",
  maxParallel: 3,
  dispatchTimeoutMs: 30 * 60 * 1000,
  postMergeTestCmd: "bun test",
  maxWaveAttempts: 2,
  subagentType: "general-purpose",
  artifactsRoot: ".claude/artifacts/loop/waves"
};

function mkCandidate(id: string, retryCount = 0, slicePath = ""): SliceCandidate {
  return {
    sliceId: id,
    featureId: `FEAT-${id}`,
    slicePath,
    priority: "P2",
    compositeScore: 0.5,
    strategicFit: 0.5,
    touches: { paths: ["src/a.mts"], confidence: "declared" },
    pmRiskLevel: 0,
    autonomousSafe: true,
    retryCount,
    pendingFix: false,
    dependsOn: [],
    helpRequestOpen: false
  };
}

function mkResult(
  id: string,
  status: "FAIL" | "timeout" | "agent_error" | "PASS" = "FAIL"
): WorktreeResult {
  return {
    sliceId: id,
    branch: `wave/X/${id}`,
    worktreePath: `/tmp/wt/${id}`,
    status,
    marker: { slice: id, status },
    artifacts: [`.claude/artifacts/crew/handoffs/${id}-fail.md`]
  };
}

describe("buildFailurePivot", () => {
  test("worktree_fail kind for status FAIL", () => {
    const p = buildFailurePivot(
      mkResult("S1"),
      { conflicts: [] },
      mkCandidate("S1"),
      "wave-1",
      cfg
    );
    expect(p.failureKind).toBe("worktree_fail");
  });

  test("timeout kind for status timeout", () => {
    const p = buildFailurePivot(
      mkResult("S1", "timeout"),
      { conflicts: [] },
      mkCandidate("S1"),
      "wave-1",
      cfg
    );
    expect(p.failureKind).toBe("timeout");
  });

  test("merge_conflict kind when finalize reports conflict for branch", () => {
    const p = buildFailurePivot(
      mkResult("S1", "PASS"),
      { conflicts: ["wave/X/S1"] },
      mkCandidate("S1"),
      "wave-1",
      cfg
    );
    expect(p.failureKind).toBe("merge_conflict");
  });

  test("retryCount incremented from candidate", () => {
    const p = buildFailurePivot(
      mkResult("S1"),
      { conflicts: [] },
      mkCandidate("S1", 1),
      "wave-1",
      cfg
    );
    expect(p.retryCount).toBe(2);
  });

  test("fixDispatchPrompt contains /devcrew:fix and failureArtifactPath", () => {
    const p = buildFailurePivot(
      mkResult("S1"),
      { conflicts: [] },
      mkCandidate("S1"),
      "wave-1",
      cfg
    );
    expect(p.fixDispatchPrompt).toContain("/devcrew:fix --slice S1");
    expect(p.fixDispatchPrompt).toContain(p.failureArtifactPath);
  });

  test("fixDispatchPrompt has no-artifact phrasing when worktree has empty artifacts", () => {
    const result = { ...mkResult("S1"), artifacts: [] };
    const p = buildFailurePivot(result, { conflicts: [] }, mkCandidate("S1"), "wave-1", cfg);
    expect(p.failureArtifactPath).toBe("");
    expect(p.fixDispatchPrompt).toContain("no failure artifact was captured");
  });
});

describe("persistPivotAt", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "wave-pivot-"));
    mkdirSync(join(tmp, "slices"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test("mutates slice frontmatter with wave_attempts + pending_fix + last_failure", async () => {
    const slicePath = join(tmp, "slices/SLICE-1.md");
    writeFileSync(
      slicePath,
      `---
id: SLICE-1
status: pending
---
body
`,
      "utf8"
    );
    const pivot = buildFailurePivot(
      mkResult("SLICE-1"),
      { conflicts: [] },
      mkCandidate("SLICE-1", 0, slicePath),
      "wave-1",
      cfg
    );
    await persistPivotAt(slicePath, pivot, cfg);
    const updated = readFileSync(slicePath, "utf8");
    expect(updated).toContain("wave_attempts: 1");
    expect(updated).toContain("pending_fix: true");
    expect(updated).toMatch(/last_failure:/);
    expect(updated).toContain("wave-1");
  });

  test("escalates to needs-review at maxWaveAttempts and moves file from pending/ to needs-review/", async () => {
    const pendingDir = join(tmp, "pending");
    mkdirSync(pendingDir, { recursive: true });
    const slicePath = join(pendingDir, "SLICE-2.md");
    writeFileSync(
      slicePath,
      `---
id: SLICE-2
status: pending
wave_attempts: 1
---
`,
      "utf8"
    );
    const pivot = buildFailurePivot(
      mkResult("SLICE-2"),
      { conflicts: [] },
      mkCandidate("SLICE-2", 1, slicePath),
      "wave-1",
      cfg
    );
    const newPath = await persistPivotAt(slicePath, pivot, cfg);

    // Original path must no longer exist; new path under needs-review/
    expect(existsSync(slicePath)).toBe(false);
    expect(newPath.replace(/\\/g, "/")).toContain("/needs-review/SLICE-2.md");
    expect(existsSync(newPath)).toBe(true);

    const updated = readFileSync(newPath, "utf8");
    expect(updated).toContain("status: needs-review");
    expect(updated).not.toContain("pending_fix: true");
  });

  test("non-escalation keeps file in place; returns original path", async () => {
    const slicePath = join(tmp, "slices/SLICE-keep.md");
    writeFileSync(
      slicePath,
      `---
id: SLICE-keep
status: pending
---
`,
      "utf8"
    );
    const pivot = buildFailurePivot(
      mkResult("SLICE-keep"),
      { conflicts: [] },
      mkCandidate("SLICE-keep", 0, slicePath),
      "wave-1",
      cfg
    );
    const newPath = await persistPivotAt(slicePath, pivot, cfg);
    expect(newPath).toBe(slicePath);
    expect(existsSync(slicePath)).toBe(true);
  });
});

describe("persistPivotAt — second failure overwrites first cleanly", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "wave-pivot-2-"));
    mkdirSync(join(tmp, "slices"), { recursive: true });
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test("calling persistPivotAt twice does not duplicate last_failure sub-fields", async () => {
    const slicePath = join(tmp, "slices/SLICE-9.md");
    writeFileSync(
      slicePath,
      `---
id: SLICE-9
status: pending
---
body
`,
      "utf8"
    );

    const pivot1 = buildFailurePivot(
      mkResult("SLICE-9"),
      { conflicts: [] },
      mkCandidate("SLICE-9", 0, slicePath),
      "wave-A",
      cfg
    );
    await persistPivotAt(slicePath, pivot1, cfg);

    const pivot2 = buildFailurePivot(
      mkResult("SLICE-9"),
      { conflicts: [] },
      mkCandidate("SLICE-9", 0, slicePath),
      "wave-B",
      cfg
    );
    await persistPivotAt(slicePath, pivot2, cfg);

    const updated = readFileSync(slicePath, "utf8");
    // Should contain wave-B exactly once, not wave-A
    expect(updated.match(/wave_id:/g) ?? []).toHaveLength(1);
    expect(updated).toContain("wave_id: wave-B");
    expect(updated).not.toContain("wave_id: wave-A");
  });
});
