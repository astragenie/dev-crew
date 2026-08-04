// src/tests/wave/mixed-confidence-order-independence.test.mts
//
// FEAT-276/SLICE-180: SLICE-179 fixed packWave() so a leading missing-
// confidence candidate no longer collapses the whole wave (push + break).
// That fix shipped with two hand-picked regression tests. This file proves
// the broader property those two don't cover: packing outcomes are
// INDEPENDENT of where missing-confidence candidates sit in the ranked
// list -- by exhaustively permuting small fixed candidate sets and
// asserting the packed SET (not just one ordering) is stable.
//
// Four properties are covered:
//   1. A well-specified (declared/inferred) candidate set packs identically
//      regardless of where missing-confidence candidates are interleaved.
//   2. The genuine solo-only case (every candidate missing-confidence)
//      always dispatches exactly one -- never zero (starvation), never more
//      than one -- for every ranking order.
//   3. When a missing-confidence candidate coexists with two conflicting
//      declared candidates, the missing candidate's position never
//      influences which of the two conflicting candidates wins; only the
//      conflicting pair's *relative* order does (ranking legitimately
//      decides priority there).
//   4. Rejection-completeness: every candidate lands in exactly one of
//      `items` / `rejected`, never silently dropped -- scoped to plans
//      where waveSize is not the limiting factor (see the FEAT-278 note
//      below).

import { describe, expect, test } from "bun:test";
import { packWave } from "../../scripts/lib/wave/planner.mjs";
import type { SliceCandidate, TouchesFilesConfidence } from "../../scripts/lib/wave/types.mjs";

function cand(
  id: string,
  paths: string[],
  confidence: TouchesFilesConfidence,
  over: Partial<SliceCandidate> = {}
): SliceCandidate {
  return {
    sliceId: id,
    featureId: `FEAT-${id}`,
    slicePath: "",
    priority: "P2",
    compositeScore: 0.5,
    strategicFit: 0.5,
    touches: { paths, confidence },
    pmRiskLevel: 0,
    autonomousSafe: true,
    retryCount: 0,
    pendingFix: false,
    dependsOn: [],
    helpRequestOpen: false,
    ...over
  };
}

// Small, exhaustive permutation generator -- fixture sets below are kept to
// 3-5 candidates specifically so full permutation (not sampling) stays cheap
// (<=120 orderings per scenario).
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i]!, ...perm]);
    }
  }
  return result;
}

const bigWave = { waveSize: 10, sliceCommand: "/crew:orchestrate-slice", waveId: "order-test" };

describe("mixed-confidence packing order-independence (FEAT-276/SLICE-180)", () => {
  test("packed set of declared candidates is stable across every permutation with interleaved missing candidates", () => {
    const base = [
      cand("M1", [], "missing"),
      cand("M2", [], "missing"),
      cand("D1", ["src/a.mts"], "declared"),
      cand("D2", ["src/b.mts"], "declared")
    ];
    const expectedPacked = new Set(["D1", "D2"]);

    for (const perm of permutations(base)) {
      const p = packWave(perm, bigWave);
      expect(new Set(p.items.map((i) => i.sliceId))).toEqual(expectedPacked);
      // picked.length > 0 in every permutation here (D1/D2 never conflict),
      // so both missing candidates are always deferred-then-rejected --
      // never solo-dispatched, never silently dropped.
      for (const missingId of ["M1", "M2"]) {
        const rej = p.rejected.find((r) => r.sliceId === missingId);
        expect(rej?.reason).toContain("missing");
      }
    }
  });

  test("an inferred-confidence candidate packs the same regardless of a missing candidate's rank position", () => {
    const base = [
      cand("M1", [], "missing"),
      cand("D1", ["src/a.mts"], "declared"),
      cand("I1", ["src/c.mts"], "inferred")
    ];
    const expectedPacked = new Set(["D1", "I1"]);

    for (const perm of permutations(base)) {
      const p = packWave(perm, bigWave);
      expect(new Set(p.items.map((i) => i.sliceId))).toEqual(expectedPacked);
      expect(p.rejected.find((r) => r.sliceId === "M1")?.reason).toContain("missing");
    }
  });

  test("all-missing-confidence wave always dispatches exactly one candidate (solo-only), never zero, for every ranking order", () => {
    const base = [cand("M1", [], "missing"), cand("M2", [], "missing"), cand("M3", [], "missing")];

    for (const perm of permutations(base)) {
      const p = packWave(perm, bigWave);
      expect(p.size).toBe(1);
      // This IS the one case where ranking legitimately decides the outcome:
      // the solo winner is whichever candidate ranked first.
      expect(p.items[0]!.sliceId).toBe(perm[0]!.sliceId);
      for (const loser of perm.slice(1)) {
        expect(p.rejected.find((r) => r.sliceId === loser.sliceId)?.reason).toContain("missing");
      }
    }
  });

  test("a missing-confidence candidate never influences which of two conflicting declared candidates wins", () => {
    const base = [
      cand("M1", [], "missing"),
      cand("C1", ["src/x.mts"], "declared"),
      cand("C2", ["src/x.mts"], "declared")
    ];

    for (const perm of permutations(base)) {
      const p = packWave(perm, bigWave);
      const c1Index = perm.findIndex((c) => c.sliceId === "C1");
      const c2Index = perm.findIndex((c) => c.sliceId === "C2");
      const expectedWinner = c1Index < c2Index ? "C1" : "C2";
      const expectedLoser = expectedWinner === "C1" ? "C2" : "C1";

      expect(p.size).toBe(1);
      expect(p.items[0]!.sliceId).toBe(expectedWinner);
      expect(p.rejected.find((r) => r.sliceId === expectedLoser)?.reason).toContain(
        "conflict_with_"
      );
      // M1's rank position (before/between/after C1 and C2) never changes
      // the winner above, and it always lands in rejected too -- never
      // silently dropped, never solo (picked.length is always 1 here).
      expect(p.rejected.find((r) => r.sliceId === "M1")?.reason).toContain("missing");
    }
  });
});

describe("rejection-completeness across permutations (non-capacity-limited plans only)", () => {
  // KNOWN GAP -- NOT covered here, NOT fixed here: packWave's capacity path
  // (`if (picked.length >= opts.waveSize) break;`) silently drops every
  // remaining ranked candidate into neither `items` nor `rejected` once the
  // wave is full, and a `waveSize <= 0` makes the entire ranked list vanish
  // the same way. That is a distinct, pre-existing defect filed as
  // FEAT-278 and is explicitly out of scope for SLICE-180. Every scenario
  // below uses waveSize >= candidate count so the capacity path never
  // triggers, keeping this assertion scoped to what SLICE-179 actually
  // fixed (the missing-confidence ordering bug).
  const scenarios: SliceCandidate[][] = [
    [
      cand("M1", [], "missing"),
      cand("D1", ["src/a.mts"], "declared"),
      cand("D2", ["src/b.mts"], "declared")
    ],
    [cand("M1", [], "missing"), cand("M2", [], "missing")],
    [
      cand("C1", ["src/x.mts"], "declared"),
      cand("C2", ["src/x.mts"], "declared"),
      cand("M1", [], "missing")
    ],
    [
      cand("I1", ["src/c.mts"], "inferred"),
      cand("M1", [], "missing"),
      cand("D1", ["src/a.mts"], "declared")
    ]
  ];

  test("every candidate lands in exactly one of items or rejected, for every permutation of each scenario", () => {
    const opts = {
      waveSize: 100,
      sliceCommand: "/crew:orchestrate-slice",
      waveId: "completeness-test"
    };

    for (const scenario of scenarios) {
      for (const perm of permutations(scenario)) {
        const p = packWave(perm, opts);
        const accountedFor = [
          ...p.items.map((i) => i.sliceId),
          ...p.rejected.map((r) => r.sliceId)
        ];
        const allIds = perm.map((c) => c.sliceId).sort();

        expect(accountedFor.length).toBe(perm.length); // no duplicates, none dropped
        expect(accountedFor.slice().sort()).toEqual(allIds);
      }
    }
  });
});
