import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { packWave, loadCandidates, applyPreFlightDrops } from "../../scripts/lib/wave/planner.mjs";
import type { SliceCandidate } from "../../scripts/lib/wave/types.mjs";

function cand(id: string, paths: string[], over: Partial<SliceCandidate> = {}): SliceCandidate {
  return {
    sliceId: id,
    featureId: `FEAT-${id}`,
    slicePath: "",
    priority: "P2",
    compositeScore: 0.5,
    strategicFit: 0.5,
    touches: { paths, confidence: paths.length > 0 ? "declared" : "missing" },
    pmRiskLevel: 0,
    autonomousSafe: true,
    retryCount: 0,
    pendingFix: false,
    dependsOn: [],
    helpRequestOpen: false,
    ...over
  };
}

const opts = { waveSize: 3, sliceCommand: "/devcrew:orchestrate-slice", waveId: "test-wave" };

describe("packWave", () => {
  test("empty ranked list returns size 0", () => {
    const p = packWave([], opts);
    expect(p.size).toBe(0);
    expect(p.items).toEqual([]);
  });

  test("packs 3 non-conflicting slices up to waveSize", () => {
    const ranked = [
      cand("S1", ["src/a.mts"]),
      cand("S2", ["src/b.mts"]),
      cand("S3", ["src/c.mts"]),
      cand("S4", ["src/d.mts"])
    ];
    const p = packWave(ranked, opts);
    expect(p.size).toBe(3);
    expect(p.items.map((i) => i.sliceId)).toEqual(["S1", "S2", "S3"]);
  });

  test("rejects conflicting slice with reason", () => {
    const ranked = [
      cand("S1", ["src/a.mts"]),
      cand("S2", ["src/a.mts"]),
      cand("S3", ["src/b.mts"])
    ];
    const p = packWave(ranked, opts);
    expect(p.items.map((i) => i.sliceId)).toEqual(["S1", "S3"]);
    expect(p.rejected).toHaveLength(1);
    expect(p.rejected[0]!.sliceId).toBe("S2");
    expect(p.rejected[0]!.reason).toContain("conflict");
  });

  // FEAT-276/SLICE-179: a leading missing-confidence candidate must never
  // collapse the whole wave. Ranking position is not a verdict -- S2 is
  // clean and non-conflicting, so it must still be packed, and S1 must be
  // visibly rejected (not silently dropped) rather than solo-dispatched.
  test("leading missing-confidence candidate does not poison later clean candidates", () => {
    const ranked = [cand("S1", []), cand("S2", ["src/b.mts"])];
    const p = packWave(ranked, opts);
    expect(p.size).toBe(1);
    expect(p.items[0]!.sliceId).toBe("S2");
    expect(p.rejected.find((r) => r.sliceId === "S1")?.reason).toContain("missing");
  });

  // Genuine solo-only case: when NO candidate in the ranked list has usable
  // touches_files, the top-ranked missing-confidence candidate must still be
  // dispatched solo -- otherwise it would starve forever and never run.
  test("missing-confidence candidate dispatched solo when no clean candidate exists", () => {
    const ranked = [cand("S1", []), cand("S2", [])];
    const p = packWave(ranked, opts);
    expect(p.size).toBe(1);
    expect(p.items[0]!.sliceId).toBe("S1");
    expect(p.rejected.find((r) => r.sliceId === "S2")?.reason).toContain("missing");
  });

  test("missing touches_files rejected when picked is non-empty", () => {
    const ranked = [cand("S1", ["src/a.mts"]), cand("S2", [])];
    const p = packWave(ranked, opts);
    expect(p.size).toBe(1);
    expect(p.rejected[0]!.sliceId).toBe("S2");
    expect(p.rejected[0]!.reason).toContain("missing");
  });

  test("WavePlanItem carries sliceCommand for downstream prompt building", () => {
    const p = packWave([cand("S1", ["src/a.mts"])], opts);
    expect(p.items[0]!.sliceCommand).toBe("/devcrew:orchestrate-slice");
    expect(p.items[0]!.sliceId).toBe("S1");
  });

  test("worktreeBranch uses waveId + sliceId", () => {
    const p = packWave([cand("S1", ["src/a.mts"])], opts);
    expect(p.items[0]!.worktreeBranch).toContain("test-wave");
    expect(p.items[0]!.worktreeBranch).toContain("S1");
  });

  test("waveSize: 1 short-circuits to ranked[0]", () => {
    const p = packWave([cand("S1", ["src/a.mts"]), cand("S2", ["src/b.mts"])], {
      ...opts,
      waveSize: 1
    });
    expect(p.size).toBe(1);
    expect(p.items[0]!.sliceId).toBe("S1");
  });

  // FEAT-205: WavePlanItem carries a classify-slice-shape.mts shape so
  // real-deps.mts::realPrepare can resolve a per-item model tier.
  test("WavePlanItem carries shape classified from an all-docs touches set", () => {
    const p = packWave([cand("S1", ["docs/guide.md"])], opts);
    expect(p.items[0]!.shape).toBe("doc-update");
  });

  test("WavePlanItem classifies a mixed-file touches set as shape 'none'", () => {
    const p = packWave([cand("S1", ["src/a.mts", "docs/b.md"])], opts);
    expect(p.items[0]!.shape).toBe("none");
  });
});

describe("loadCandidates", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "wave-load-"));
    mkdirSync(join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending"), { recursive: true });
    mkdirSync(join(tmp, ".claude/artifacts/loop/backlog/triaged"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test("loads pending slices with touches_files into candidates", () => {
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending/SLICE-1.md"),
      `---
id: SLICE-1
feature: FEAT-1
priority: P2
touches_files:
  - src/a.mts
touches_files_confidence: declared
---
`,
      "utf8"
    );
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/backlog/triaged/FEAT-1.md"),
      `---
id: FEAT-1
priority: P2
composite_score: 0.7
pm_strategic_fit: 0.6
pm_risk_level: 0.2
autonomous_safe: true
---
`,
      "utf8"
    );
    const cands = loadCandidates(tmp);
    expect(cands).toHaveLength(1);
    expect(cands[0]!.sliceId).toBe("SLICE-1");
    expect(cands[0]!.compositeScore).toBe(0.7);
    expect(cands[0]!.touches.confidence).toBe("declared");
  });

  test("skips slice when parent FEAT missing from triaged", () => {
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending/SLICE-2.md"),
      `---
id: SLICE-2
feature: FEAT-MISSING
---
`,
      "utf8"
    );
    const cands = loadCandidates(tmp);
    expect(cands).toHaveLength(0);
  });
});

describe("applyPreFlightDrops", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "wave-preflight-"));
    mkdirSync(join(tmp, ".claude/artifacts/loop/backlog/done"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test("drops autonomous_safe=false AND pm_risk_level >= 0.7", () => {
    const c = cand("S1", ["src/a.mts"], { autonomousSafe: false, pmRiskLevel: 0.8 });
    const r = applyPreFlightDrops([c], tmp);
    expect(r.passed).toHaveLength(0);
    expect(r.dropped).toHaveLength(1);
    expect(r.dropped[0]!.reason).toContain("autonomous_safe=false");
  });

  test("keeps autonomous_safe=false when pm_risk_level < 0.7", () => {
    const c = cand("S1", ["src/a.mts"], { autonomousSafe: false, pmRiskLevel: 0.3 });
    const r = applyPreFlightDrops([c], tmp);
    expect(r.passed).toHaveLength(1);
  });

  test("drops slice with unfinished depends_on", () => {
    const c = cand("S1", ["src/a.mts"], { dependsOn: ["FEAT-99"] });
    const r = applyPreFlightDrops([c], tmp);
    expect(r.passed).toHaveLength(0);
    expect(r.dropped[0]!.reason).toContain("FEAT-99");
  });

  test("keeps slice when depends_on is done", () => {
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/backlog/done/FEAT-99.md"),
      "---\nid: FEAT-99\n---\n",
      "utf8"
    );
    const c = cand("S1", ["src/a.mts"], { dependsOn: ["FEAT-99"] });
    const r = applyPreFlightDrops([c], tmp);
    expect(r.passed).toHaveLength(1);
  });

  test("drops slice with helpRequestOpen=true", () => {
    const c = cand("S1", ["src/a.mts"], { helpRequestOpen: true });
    const r = applyPreFlightDrops([c], tmp);
    expect(r.passed).toHaveLength(0);
    expect(r.dropped[0]!.reason).toContain("help_request");
  });
});
