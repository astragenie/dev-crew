import { describe, expect, test } from "bun:test";
import { rankCandidates } from "../../scripts/lib/wave/ranking.mjs";
import type { SliceCandidate } from "../../scripts/lib/wave/types.mjs";

function cand(over: Partial<SliceCandidate>): SliceCandidate {
  return {
    sliceId: "SLICE-X",
    featureId: "FEAT-X",
    slicePath: "",
    priority: "P3",
    compositeScore: 0,
    strategicFit: 0,
    touches: { paths: [], confidence: "missing" },
    pmRiskLevel: 0,
    autonomousSafe: true,
    retryCount: 0,
    pendingFix: false,
    dependsOn: [],
    helpRequestOpen: false,
    ...over
  };
}

describe("rankCandidates", () => {
  test("pendingFix items first", () => {
    const a = cand({ sliceId: "A", compositeScore: 0.9 });
    const b = cand({ sliceId: "B", compositeScore: 0.1, pendingFix: true });
    expect(rankCandidates([a, b]).map((c) => c.sliceId)).toEqual(["B", "A"]);
  });
  test("compositeScore DESC among non-pending", () => {
    const a = cand({ sliceId: "A", compositeScore: 0.5 });
    const b = cand({ sliceId: "B", compositeScore: 0.8 });
    expect(rankCandidates([a, b]).map((c) => c.sliceId)).toEqual(["B", "A"]);
  });
  test("priority breaks ties: P0 > P1 > P2 > P3", () => {
    const a = cand({ sliceId: "A", priority: "P2" });
    const b = cand({ sliceId: "B", priority: "P0" });
    expect(rankCandidates([a, b]).map((c) => c.sliceId)).toEqual(["B", "A"]);
  });
  test("strategicFit DESC breaks priority ties", () => {
    const a = cand({ sliceId: "A", priority: "P2", strategicFit: 0.3 });
    const b = cand({ sliceId: "B", priority: "P2", strategicFit: 0.7 });
    expect(rankCandidates([a, b]).map((c) => c.sliceId)).toEqual(["B", "A"]);
  });
  test("retryCount ASC breaks strategicFit ties", () => {
    const a = cand({ sliceId: "A", retryCount: 1 });
    const b = cand({ sliceId: "B", retryCount: 0 });
    expect(rankCandidates([a, b]).map((c) => c.sliceId)).toEqual(["B", "A"]);
  });
});
