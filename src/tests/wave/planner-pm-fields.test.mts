// FEAT-034: the wave planner previously read composite_score/
// pm_strategic_fit/pm_risk_level — field names no writer in this repo
// (pm-apply.mts, intake.mts) ever produces. pm-apply.mts actually writes
// pm_composite_priority/pm_strategic_alignment/pm_technical_risk, so every
// triaged FEAT scored 0 on all three: ranking was flat and the
// autonomous_safe=false + high-risk pre-flight gate could never fire
// (FEAT-031-class slices would be packed as if safe). These tests exercise
// loadCandidates()/applyPreFlightDrops() against on-disk fixtures shaped
// exactly like pm-apply.mts's real output, plus the legacy-name fallback
// for already-triaged adopter backlogs.

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadCandidates, applyPreFlightDrops, packWave } from "../../scripts/lib/wave/planner.mjs";
import { rankCandidates } from "../../scripts/lib/wave/ranking.mjs";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-pm-fields-"));
  mkdirSync(join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending"), { recursive: true });
  mkdirSync(join(tmp, ".claude/artifacts/loop/backlog/triaged"), { recursive: true });
  mkdirSync(join(tmp, ".claude/artifacts/loop/backlog/done"), { recursive: true });
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeSlice(id: string, featureId: string, priority = "P2"): void {
  writeFileSync(
    join(tmp, `.claude/artifacts/loop/ai-loop/slices/pending/${id}.md`),
    `---\nid: ${id}\nfeature: ${featureId}\npriority: ${priority}\ntouches_files:\n  - src/${id}.mts\ntouches_files_confidence: declared\n---\n`,
    "utf8"
  );
}

function writeFeature(id: string, frontmatterBody: string, dir = "triaged"): void {
  writeFileSync(
    join(tmp, `.claude/artifacts/loop/backlog/${dir}/${id}.md`),
    `---\nid: ${id}\n${frontmatterBody}---\n`,
    "utf8"
  );
}

describe("loadCandidates — real pm-apply.mts field names", () => {
  // AC-1: pm_technical_risk 0.8 + autonomous_safe false must actually drop
  // the slice at the pre-flight gate, with the exact reason string the FEAT
  // AC asserts (format carries the legacy `pm_risk_level=` label on purpose
  // — the FEAT body requires it verbatim even though the source field is
  // now pm_technical_risk).
  test("AC-1: pm_technical_risk 0.8 + autonomous_safe false is dropped with the exact pre-flight reason", () => {
    writeSlice("SLICE-1", "FEAT-1", "P0");
    writeFeature("FEAT-1", "priority: P0\npm_technical_risk: 0.8\nautonomous_safe: false\n");
    const cands = loadCandidates(tmp);
    expect(cands).toHaveLength(1);
    expect(cands[0]!.pmRiskLevel).toBe(0.8);

    const { passed, dropped } = applyPreFlightDrops(cands, tmp);
    expect(passed).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]!.sliceId).toBe("SLICE-1");
    expect(dropped[0]!.reason).toBe(
      "pre-flight: autonomous_safe=false AND pm_risk_level=0.80 >= 0.7"
    );
  });

  test("legacy pm_risk_level name still works as a fallback when pm_technical_risk is absent", () => {
    writeSlice("SLICE-2", "FEAT-2", "P0");
    writeFeature("FEAT-2", "priority: P0\npm_risk_level: 0.9\nautonomous_safe: false\n");
    const cands = loadCandidates(tmp);
    expect(cands[0]!.pmRiskLevel).toBe(0.9);
    const { dropped } = applyPreFlightDrops(cands, tmp);
    expect(dropped).toHaveLength(1);
  });

  test("pm_technical_risk below threshold is not dropped even when autonomous_safe is false", () => {
    writeSlice("SLICE-3", "FEAT-3", "P0");
    writeFeature("FEAT-3", "priority: P0\npm_technical_risk: 0.3\nautonomous_safe: false\n");
    const cands = loadCandidates(tmp);
    const { passed, dropped } = applyPreFlightDrops(cands, tmp);
    expect(dropped).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  // AC-2: a P0 FEAT ranked ahead of a P2 FEAT, both using the real
  // pm_composite_priority field, with no file conflicts.
  test("AC-2: pm_composite_priority P0 ranks ahead of P2", () => {
    writeSlice("SLICE-P0", "FEAT-P0", "P0");
    writeFeature(
      "FEAT-P0",
      "priority: P0\npm_composite_priority: P0\npm_technical_risk: 0.1\nautonomous_safe: true\n"
    );
    writeSlice("SLICE-P2", "FEAT-P2", "P2");
    writeFeature(
      "FEAT-P2",
      "priority: P2\npm_composite_priority: P2\npm_technical_risk: 0.1\nautonomous_safe: true\n"
    );

    const cands = loadCandidates(tmp);
    const byId = new Map(cands.map((c) => [c.sliceId, c]));
    expect(byId.get("SLICE-P0")!.compositeScore).toBe(1.0);
    expect(byId.get("SLICE-P2")!.compositeScore).toBe(0.5);

    const ranked = rankCandidates(cands);
    expect(ranked[0]!.sliceId).toBe("SLICE-P0");

    const plan = packWave(ranked, {
      waveSize: 2,
      sliceCommand: "/devcrew:orchestrate-slice",
      waveId: "test-wave"
    });
    expect(plan.items.map((i) => i.sliceId)).toEqual(["SLICE-P0", "SLICE-P2"]);
  });

  test("legacy composite_score/pm_strategic_fit names still work as a fallback", () => {
    writeSlice("SLICE-4", "FEAT-4", "P2");
    writeFeature(
      "FEAT-4",
      "priority: P2\ncomposite_score: 0.9\npm_strategic_fit: 0.4\npm_technical_risk: 0.1\nautonomous_safe: true\n"
    );
    const cands = loadCandidates(tmp);
    expect(cands[0]!.compositeScore).toBe(0.9);
    expect(cands[0]!.strategicFit).toBe(0.4);
  });

  test("absent pm fields fall back to 0 (no writer ever omits them in practice, but must not throw)", () => {
    writeSlice("SLICE-5", "FEAT-5", "P3");
    writeFeature("FEAT-5", "priority: P3\n");
    const cands = loadCandidates(tmp);
    expect(cands[0]!.compositeScore).toBe(0);
    expect(cands[0]!.strategicFit).toBe(0);
    expect(cands[0]!.pmRiskLevel).toBe(0);
  });
});
